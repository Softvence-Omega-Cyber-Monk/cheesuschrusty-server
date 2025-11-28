import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionPlan as PrismaSubscriptionPlan } from '@prisma/client';
import Stripe from 'stripe';
import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';

// Utility for converting Unix timestamps to Date objects
const toDate = (timestamp: number): Date => new Date(timestamp * 1000);

// Local augmentation type for subscription timestamps returned by Stripe at runtime
type StripeSubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

@Injectable()
export class SubscriptionService {
  public stripe: Stripe; // Expose stripe instance for the controller's webhook handling
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private planService: SubscriptionPlanService,
  ) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not configured in environment.');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    });
  }

  /**
   * 1️⃣ Create subscription checkout session
   * This now takes the planAlias to dynamically look up the price ID.
   */
  async createCheckout(userId: string, planAlias: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
   console.log(user)
    // 1. Get the plan configuration (to get the dynamic stripePriceId)
    const planConfig = await this.planService.getPlanByAlias(planAlias);

    if (!planConfig.isActive) {
      throw new NotFoundException(`Plan ${planAlias} is not currently active for purchase.`);
    }

    // Create a customer if one doesn't exist.
    let stripeCustomerId = user.stripeCustomerId; // Assuming you updated User model
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      // Update the user in your database with the new customer ID
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: stripeCustomerId },
      });
    }

    // 2. Create the Checkout Session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      customer: stripeCustomerId,
      success_url: `${process.env.CLIENT_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscribe/cancel`,
      // Pass both internal userId and the plan alias for webhook activation
      metadata: { userId: user.id, planAlias: planConfig.alias },
      subscription_data: {
      metadata: {
      userId: user.id,
      planAlias: planConfig.alias,
    },
  },
    });

    if (!session.url) {
      throw new InternalServerErrorException('Failed to generate Stripe checkout URL.');
    }

    return { checkoutUrl: session.url };
  }

  /** 2️⃣ Handle webhook from Stripe */
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // The session contains the subscription ID and metadata needed for activation
        if (session.mode === 'subscription') {
          await this.activateSubscription(session);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        // Safely extract the subscription ID/Object from the invoice using type assertion
        const subscriptionIdOrObject = (invoice as any).subscription as (string | Stripe.Subscription | null | undefined);

        // Only process invoices linked to a subscription renewal
        if (!subscriptionIdOrObject) return;

        // Determine the ID to pass to retrieve
        const subId = typeof subscriptionIdOrObject === 'string'
          ? subscriptionIdOrObject
          : subscriptionIdOrObject.id;

        // retrieve returns Response<Subscription>, so cast through `unknown` to our local augmented type
        const subscription = (await this.stripe.subscriptions.retrieve(subId)) as unknown as StripeSubscriptionWithPeriods;

        await this.updateSubscriptionPeriod(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.markSubscriptionDeleted(sub);
        break;
      }

      // Handle when a subscription update is made (e.g., change plan)
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        // event object may or may not include the unix fields — normalize by casting through unknown
        const subscription = sub as unknown as StripeSubscriptionWithPeriods;
        await this.updateSubscriptionPeriod(subscription);
        break;
      }
    }
  }

  /** Mark subscription ACTIVE after successful payment (first time only) */
  private async activateSubscription(session: Stripe.Checkout.Session) {
    console.log(session.metadata)
    const userId = session.metadata?.userId;
    const planAlias = session.metadata?.planAlias;

    // When mode is 'subscription', session.subscription is the subscription ID string
    const stripeSubscriptionId = session.subscription as string;

    if (!userId || !stripeSubscriptionId || !planAlias) {
      this.logger.error('Missing critical metadata in checkout session completion event.');
      return;
    }

    // retrieve returns Response<Subscription>, so cast through unknown to our augmented type
    const subscription = (await this.stripe.subscriptions.retrieve(
      stripeSubscriptionId
    )) as unknown as StripeSubscriptionWithPeriods;

    // Map your plan alias string to the Prisma enum (SubscriptionPlan)
     const planEnum = 'PRO' as const;

    // Ensure subscription.customer is a string (ID) before using it in the database
    const stripeCustomerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeSubscriptionId: stripeSubscriptionId,
        status: subscription.status, // e.g. 'active'
        plan: planEnum,
        currentPeriodStart: toDate(subscription.current_period_start),
        currentPeriodEnd: toDate(subscription.current_period_end),
      },
      create: {
        userId,
        stripeCustomerId: stripeCustomerId,
        stripeSubscriptionId: stripeSubscriptionId,
        plan: planEnum,
        status: subscription.status,
        currentPeriodStart: toDate(subscription.current_period_start),
        currentPeriodEnd: toDate(subscription.current_period_end),
      },
    });
    this.logger.log(`Subscription activated for User: ${userId} for plan ${planAlias}.`);
  }

  /**
   * Update subscription dates on renewal (invoice.payment_succeeded or subscription.updated)
   * Accepts a subscription object which we normalize to include the unix period fields
   */
  private async updateSubscriptionPeriod(subscription: Stripe.Subscription | StripeSubscriptionWithPeriods) {
    // Normalize the incoming subscription to our local type (cast through unknown to satisfy TS)
    const sub = subscription as unknown as StripeSubscriptionWithPeriods;

    const userId = sub.metadata?.userId;
    const planAlias = sub.metadata?.planAlias;

    if (!userId) {
      this.logger.error('Missing userId in subscription metadata for period update.');
      return;
    }

    // Map your plan alias string to the Prisma enum (SubscriptionPlan)
     const planEnum = 'PRO' as const;
    // If the fields are missing (defensive), attempt to fetch from Stripe using the subscription id
    if (typeof sub.current_period_end !== 'number' || typeof sub.current_period_start !== 'number') {
      this.logger.debug('Subscription object missing period timestamps — retrieving full subscription from Stripe.');
      const fetched = (await this.stripe.subscriptions.retrieve(sub.id)) as unknown as StripeSubscriptionWithPeriods;
      // overwrite sub with fetched so we have period fields
      Object.assign(sub, fetched);
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: sub.status,
        plan: planEnum,
        currentPeriodStart: toDate(sub.current_period_start),
        currentPeriodEnd: toDate(sub.current_period_end),
      },
    });

    this.logger.log(`Subscription period updated for User: ${userId}. New end date: ${toDate(sub.current_period_end).toISOString()}`);
  }

  /** Mark subscription as CANCELED (or 'past_due' if needed) */
  private async markSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const userId = stripeSub.metadata?.userId;
    if (!userId) return;

    await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'CANCELED' },
    });
    this.logger.log(`Subscription marked CANCELED for User: ${userId}.`);
  }

  /** 3️⃣ User-facing API to cancel subscription */
  async cancelUserSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });

    if (!sub || sub.status !== 'active' || !sub.stripeSubscriptionId) {
      throw new NotFoundException('Active subscription not found or not managed by Stripe.');
    }

    // Cancel in Stripe: set cancel_at_period_end = true
    await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Stripe's webhook (customer.subscription.updated) will update the status 
    // but we can preemptively mark it locally for immediate UI feedback.
    await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'CANCELED_AT_PERIOD_END' }, // ensure this status exists or map to your schema
    });
    this.logger.log(`Subscription cancellation scheduled for User: ${userId}.`);
  }

  /** Check if user is active subscriber */
  async isActive(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!sub || sub.status === 'canceled' || sub.status === 'trialing') return false;

    const now = new Date();
    // Allow access if the current period hasn't ended yet
    return sub.currentPeriodEnd >= now;
  }
}
