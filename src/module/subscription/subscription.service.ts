// import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
// import { PrismaService } from 'src/prisma/prisma.service';
// import Stripe from 'stripe';
// import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';

// // Utility for converting Unix timestamps to Date objects
// const toDate = (timestamp: number): Date => new Date(timestamp * 1000);

// // Local augmentation type for subscription timestamps returned by Stripe at runtime
// type StripeSubscriptionWithPeriods = Stripe.Subscription & {
//   current_period_start: number;
//   current_period_end: number;
// };

// @Injectable()
// export class SubscriptionService {
//   public stripe: Stripe; // Expose stripe instance for the controller's webhook handling
//   private readonly logger = new Logger(SubscriptionService.name);

//   constructor(
//     private prisma: PrismaService,
//     private planService: SubscriptionPlanService,
//   ) {
//     const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
//     if (!stripeSecretKey) {
//       throw new InternalServerErrorException('STRIPE_SECRET_KEY is not configured in environment.');
//     }

//     this.stripe = new Stripe(stripeSecretKey, {
//       apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
//     });
//   }

//   /**
//    * 1️⃣ Create subscription checkout session
//    * This now takes the planAlias to dynamically look up the price ID.
//    */
//   async createCheckout(userId: string, planAlias: string) {
//     const user = await this.prisma.user.findUnique({ where: { id: userId } });
//     if (!user) throw new NotFoundException('User not found');

//     // 1. Get the plan configuration (to get the dynamic stripePriceId)
//     const planConfig = await this.planService.getPlanByAlias(planAlias);

//     if (!planConfig.isActive) {
//       throw new NotFoundException(`Plan ${planAlias} is not currently active for purchase.`);
//     }

//     // Create a customer if one doesn't exist.
//     let stripeCustomerId = user.stripeCustomerId; // Assuming you updated User model
//     if (!stripeCustomerId) {
//       const customer = await this.stripe.customers.create({
//         email: user.email,
//         metadata: { userId: user.id },
//       });
//       stripeCustomerId = customer.id;
//       // Update the user in your database with the new customer ID
//       await this.prisma.user.update({
//         where: { id: userId },
//         data: { stripeCustomerId: stripeCustomerId },
//       });
//     }

//     // 2. Create the Checkout Session
//     const session = await this.stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       mode: 'subscription',
//       line_items: [
//         {
//           price: planConfig.stripePriceId,
//           quantity: 1,
//         },
//       ],
//       customer: stripeCustomerId,
//       success_url: `${process.env.CLIENT_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${process.env.CLIENT_URL}/subscribe/cancel`,
//       // Pass both internal userId and the plan alias for webhook activation
//       metadata: { userId: user.id, planAlias: planConfig.alias },
//       subscription_data: {
//       metadata: {
//       userId: user.id,
//       planAlias: planConfig.alias,
//     },
//   },
//     });

//     if (!session.url) {
//       throw new InternalServerErrorException('Failed to generate Stripe checkout URL.');
//     }

//     return { checkoutUrl: session.url };
//   }

//   /** 2️⃣ Handle webhook from Stripe */
//   async handleWebhook(event: Stripe.Event) {
//     switch (event.type) {
//       case 'checkout.session.completed': {
//         const session = event.data.object as Stripe.Checkout.Session;
//         // The session contains the subscription ID and metadata needed for activation
//         if (session.mode === 'subscription') {
//           await this.activateSubscription(session);
//         }
//         break;
//       }

//       case 'invoice.payment_succeeded': {
//         const invoice = event.data.object as Stripe.Invoice;

//         // Safely extract the subscription ID/Object from the invoice using type assertion
//         const subscriptionIdOrObject = (invoice as any).subscription as (string | Stripe.Subscription | null | undefined);

//         // Only process invoices linked to a subscription renewal
//         if (!subscriptionIdOrObject) return;

//         // Determine the ID to pass to retrieve
//         const subId = typeof subscriptionIdOrObject === 'string'
//           ? subscriptionIdOrObject
//           : subscriptionIdOrObject.id;

//         // retrieve returns Response<Subscription>, so cast through `unknown` to our local augmented type
//         const subscription = (await this.stripe.subscriptions.retrieve(subId)) as unknown as StripeSubscriptionWithPeriods;

//         await this.updateSubscriptionPeriod(subscription);
//         break;
//       }

//       case 'customer.subscription.deleted': {
//         const sub = event.data.object as Stripe.Subscription;
//         await this.markSubscriptionDeleted(sub);
//         break;
//       }

//       // Handle when a subscription update is made (e.g., change plan)
//       case 'customer.subscription.updated': {
//         const sub = event.data.object as Stripe.Subscription;
//         // event object may or may not include the unix fields — normalize by casting through unknown
//         const subscription = sub as unknown as StripeSubscriptionWithPeriods;
//         await this.updateSubscriptionPeriod(subscription);
//         break;
//       }
//     }
//   }

//   /** Mark subscription ACTIVE after successful payment (first time only) */
//   private async activateSubscription(session: Stripe.Checkout.Session) {
//     const userId = session.metadata?.userId;
//     const planAlias = session.metadata?.planAlias;

//     // When mode is 'subscription', session.subscription is the subscription ID string
//     const stripeSubscriptionId = session.subscription as string;

//     if (!userId || !stripeSubscriptionId || !planAlias) {
//       this.logger.error('Missing critical metadata in checkout session completion event.');
//       return;
//     }

//     // retrieve returns Response<Subscription>, so cast through unknown to our augmented type
//     const subscription = (await this.stripe.subscriptions.retrieve(
//       stripeSubscriptionId
//     )) as unknown as StripeSubscriptionWithPeriods;

//     // Map your plan alias string to the Prisma enum (SubscriptionPlan)
//      const planEnum = 'PRO' as const;

//     // Ensure subscription.customer is a string (ID) before using it in the database
//     const stripeCustomerId = typeof subscription.customer === 'string'
//       ? subscription.customer
//       : subscription.customer.id;

//     await this.prisma.subscription.upsert({
//       where: { userId },
//       update: {
//         stripeSubscriptionId: stripeSubscriptionId,
//         status: subscription.status, // e.g. 'active'
//         plan: planEnum,
//         planAlias: planAlias,
//         currentPeriodStart: toDate(subscription.current_period_start),
//         currentPeriodEnd: toDate(subscription.current_period_end),
//       },
//       create: {
//         userId,
//         stripeCustomerId: stripeCustomerId,
//         stripeSubscriptionId: stripeSubscriptionId,
//         plan: planEnum,
//         planAlias: planAlias,
//         status: subscription.status,
//         currentPeriodStart: toDate(subscription.current_period_start),
//         currentPeriodEnd: toDate(subscription.current_period_end),
//       },
//     });
//     this.logger.log(`Subscription activated for User: ${userId} for plan ${planAlias}.`);
//   }

//   /**
//    * Update subscription dates on renewal (invoice.payment_succeeded or subscription.updated)
//    * Accepts a subscription object which we normalize to include the unix period fields
//    */
//   private async updateSubscriptionPeriod(subscription: Stripe.Subscription | StripeSubscriptionWithPeriods) {
//     // Normalize the incoming subscription to our local type (cast through unknown to satisfy TS)
//     const sub = subscription as unknown as StripeSubscriptionWithPeriods;

//     const userId = sub.metadata?.userId;
//     const planAlias = sub.metadata?.planAlias;

//     if (!userId) {
//       this.logger.error('Missing userId in subscription metadata for period update.');
//       return;
//     }

//     // Map your plan alias string to the Prisma enum (SubscriptionPlan)
//      const planEnum = 'PRO' as const;
//     // If the fields are missing (defensive), attempt to fetch from Stripe using the subscription id
//     if (typeof sub.current_period_end !== 'number' || typeof sub.current_period_start !== 'number') {
//       this.logger.debug('Subscription object missing period timestamps — retrieving full subscription from Stripe.');
//       const fetched = (await this.stripe.subscriptions.retrieve(sub.id)) as unknown as StripeSubscriptionWithPeriods;
//       // overwrite sub with fetched so we have period fields
//       Object.assign(sub, fetched);
//     }

//     await this.prisma.subscription.update({
//       where: { userId },
//       data: {
//         status: sub.status,
//         plan: planEnum,
//         planAlias: planAlias,
//         currentPeriodStart: toDate(sub.current_period_start),
//         currentPeriodEnd: toDate(sub.current_period_end),
//       },
//     });

//     this.logger.log(`Subscription period updated for User: ${userId}. New end date: ${toDate(sub.current_period_end).toISOString()}`);
//   }

//   /** Mark subscription as CANCELED (or 'past_due' if needed) */
//   private async markSubscriptionDeleted(stripeSub: Stripe.Subscription) {
//     const userId = stripeSub.metadata?.userId;
//     if (!userId) return;

//     await this.prisma.subscription.update({
//       where: { userId },
//       data: { status: 'CANCELED' },
//     });
//     this.logger.log(`Subscription marked CANCELED for User: ${userId}.`);
//   }

//   /** 3️⃣ User-facing API to cancel subscription */
//   async cancelUserSubscription(userId: string) {
//     const sub = await this.prisma.subscription.findUnique({ where: { userId } });

//     if (!sub || sub.status !== 'active' || !sub.stripeSubscriptionId) {
//       throw new NotFoundException('Active subscription not found or not managed by Stripe.');
//     }

//     // Cancel in Stripe: set cancel_at_period_end = true
//     await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
//       cancel_at_period_end: true,
//     });

//     // Stripe's webhook (customer.subscription.updated) will update the status 
//     // but we can preemptively mark it locally for immediate UI feedback.
//     await this.prisma.subscription.update({
//       where: { userId },
//       data: { status: 'CANCELED_AT_PERIOD_END' }, // ensure this status exists or map to your schema
//     });
//     this.logger.log(`Subscription cancellation scheduled for User: ${userId}.`);
//   }

//   /** Check if user is active subscriber */
//   async isActive(userId: string): Promise<boolean> {
//     const sub = await this.prisma.subscription.findUnique({
//       where: { userId },
//     });

//     if (!sub || sub.status === 'canceled' || sub.status === 'trialing') return false;

//     const now = new Date();
//     // Allow access if the current period hasn't ended yet
//     return sub.currentPeriodEnd >= now;
//   }



// /**
//  * Fetch full subscription details for the Frontend UI.
//  * Returns plan alias, status, and end date.
//  */
// async getMySubscriptionDetails(userId: string) {
//   const sub = await this.prisma.subscription.findUnique({
//     where: { userId },
//   });

//   if (!sub) {
//     return { 
//       status: 'none', 
//       plan: 'FREE', 
//       isPro: false 
//     };
//   }

//   // Check if actually active
//   const isValid = 
//     sub.status === 'active' || 
//     sub.status === 'trialing' || 
//     (sub.status === 'canceled' && sub.currentPeriodEnd >= new Date());

//   return {
//     status: sub.status, // e.g. 'active', 'canceled'
//     isPro: isValid,
//     planAlias: sub.planAlias, // 'PRO_MONTHLY' or 'PRO_YEARLY'
//     currentPeriodEnd: sub.currentPeriodEnd, // "2025-11-29..."
//     cancelAtPeriodEnd: sub.status === 'canceled' // Helpful for UI logic
//   };
// }



// }

import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import Stripe from 'stripe';
import { SubscriptionPlanService } from '../subscription-plan/subscription-plan.service';
import { SubscriptionPlan as PrismaSubscriptionPlan } from '@prisma/client'; // Import for type safety

// Utility for converting Unix timestamps to Date objects
const toDate = (timestamp: number): Date => new Date(timestamp * 1000);

// Local augmentation type for subscription timestamps returned by Stripe at runtime
type StripeSubscriptionWithPeriods = Stripe.Subscription & {
	current_period_start: number;
	current_period_end: number;
};

// 🎯 Normalize status strings to lowercase for consistency
type SubscriptionStatusString = 'trialing' | 'active' | 'canceled' | 'canceled_at_period_end' | string;

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

		// --- 🎯 TRIAL ELIGIBILITY CHECK ---
		const isProPlan = planAlias.toUpperCase().includes('PRO');

		// If the plan is PRO (monthly/yearly) and the user has used the trial, prevent checkout.
		if (user.hasUsedTrial && isProPlan) {
			throw new NotFoundException('Trial already used. Please purchase a full plan.');
		}

		// Determine trial days: 7 days if it's a PRO plan AND the user hasn't used the trial yet.
		const trialDays = (!user.hasUsedTrial && isProPlan) ? 7 : undefined;
		// ---------------------------------

		// 1. Get the plan configuration (to get the dynamic stripePriceId)
		const planConfig = await this.planService.getPlanByAlias(planAlias);

		if (!planConfig.isActive) {
			throw new NotFoundException(`Plan ${planAlias} is not currently active for purchase.`);
		}

		// Create a customer if one doesn't exist.
		let stripeCustomerId = user.stripeCustomerId; 
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
				// 🎯 Apply the trial period here if trialDays is set
				...(trialDays !== undefined && { trial_period_days: trialDays }),
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
				const subscriptionIdOrObject = (invoice as any).subscription as (string | Stripe.Subscription | null | undefined);

				// Only process invoices linked to a subscription renewal
				if (!subscriptionIdOrObject) return;

				const subId = typeof subscriptionIdOrObject === 'string'
					? subscriptionIdOrObject
					: subscriptionIdOrObject.id;

				const subscription = (await this.stripe.subscriptions.retrieve(subId)) as unknown as StripeSubscriptionWithPeriods;

				await this.updateSubscriptionPeriod(subscription);
				break;
			}

			case 'customer.subscription.deleted': {
				const sub = event.data.object as Stripe.Subscription;
				await this.markSubscriptionDeleted(sub);
				break;
			}

			// Handle when a subscription update is made (e.g., change plan or cancellation request)
			case 'customer.subscription.updated': {
				const sub = event.data.object as Stripe.Subscription;
				const subscription = sub as unknown as StripeSubscriptionWithPeriods;
				await this.updateSubscriptionPeriod(subscription);
				break;
			}
		}
	}

	/** Mark subscription ACTIVE after successful payment (first time only) */
	private async activateSubscription(session: Stripe.Checkout.Session) {
		const userId = session.metadata?.userId;
		const planAlias = session.metadata?.planAlias;
		const stripeSubscriptionId = session.subscription as string;

		if (!userId || !stripeSubscriptionId || !planAlias) {
			this.logger.error('Missing critical metadata in checkout session completion event.');
			return;
		}

		const subscription = (await this.stripe.subscriptions.retrieve(
			stripeSubscriptionId
		)) as unknown as StripeSubscriptionWithPeriods;

		// Use the hardcoded PRO as the access level
		const planEnum = 'PRO' as PrismaSubscriptionPlan; 

		const stripeCustomerId = typeof subscription.customer === 'string'
			? subscription.customer
			: subscription.customer.id;

		// --- 🎯 SET hasUsedTrial TO TRUE ---
		if (subscription.status === 'trialing' || subscription.status === 'active') {
			await this.prisma.user.update({
				where: { id: userId },
				data: { hasUsedTrial: true },
			});
		}
		// ----------------------------------
		
		// 🎯 FIX: Store status in lowercase
		const dbStatus = subscription.status.toLowerCase();

		await this.prisma.subscription.upsert({
			where: { userId },
			update: {
				stripeSubscriptionId: stripeSubscriptionId,
				status: dbStatus, // e.g. 'active' or 'trialing' (lowercase)
				plan: planEnum,
				planAlias: planAlias,
				currentPeriodStart: toDate(subscription.current_period_start),
				currentPeriodEnd: toDate(subscription.current_period_end),
			},
			create: {
				userId,
				stripeCustomerId: stripeCustomerId,
				stripeSubscriptionId: stripeSubscriptionId,
				plan: planEnum,
				planAlias: planAlias,
				status: dbStatus,
				currentPeriodStart: toDate(subscription.current_period_start),
				currentPeriodEnd: toDate(subscription.current_period_end),
			},
		});
		this.logger.log(`Subscription activated for User: ${userId} for plan ${planAlias}. Status: ${dbStatus}`);
	}

	/**
	 * Update subscription dates on renewal or status change (webhook handler)
	 */
	private async updateSubscriptionPeriod(subscription: Stripe.Subscription | StripeSubscriptionWithPeriods) {
		const sub = subscription as unknown as StripeSubscriptionWithPeriods;

		const userId = sub.metadata?.userId;
		const planAlias = sub.metadata?.planAlias;

		if (!userId) {
			this.logger.error('Missing userId in subscription metadata for period update.');
			return;
		}

		const planEnum = 'PRO' as PrismaSubscriptionPlan;

		// Defensive fetch for period timestamps
		if (typeof sub.current_period_end !== 'number' || typeof sub.current_period_start !== 'number') {
			this.logger.debug('Subscription object missing period timestamps — retrieving full subscription from Stripe.');
			const fetched = (await this.stripe.subscriptions.retrieve(sub.id)) as unknown as StripeSubscriptionWithPeriods;
			Object.assign(sub, fetched);
		}

		// 🎯 CRITICAL FIX: Determine status based on the cancel_at_period_end flag
		let dbStatus: SubscriptionStatusString;
		if (sub.cancel_at_period_end === true) {
			// If scheduled for cancellation, use our local status in lowercase.
			dbStatus = 'canceled_at_period_end';
		} else {
			// Otherwise, rely on Stripe's reported status and convert to lowercase.
			dbStatus = sub.status.toLowerCase();
		}

		await this.prisma.subscription.update({
			where: { userId },
			data: {
				status: dbStatus, // Now consistently lowercase
				plan: planEnum,
				planAlias: planAlias,
				currentPeriodStart: toDate(sub.current_period_start),
				currentPeriodEnd: toDate(sub.current_period_end),
			},
		});

		this.logger.log(`Subscription period updated for User: ${userId}. New end date: ${toDate(sub.current_period_end).toISOString()}. Status: ${dbStatus}`);
	}


	/** Mark subscription as 'canceled' (on customer.subscription.deleted webhook) */
	private async markSubscriptionDeleted(stripeSub: Stripe.Subscription) {
		const userId = stripeSub.metadata?.userId;
		if (!userId) return;

		await this.prisma.subscription.update({
			where: { userId },
			// 🎯 FIX: Store status in lowercase
			data: { status: 'canceled' },
		});
		this.logger.log(`Subscription marked canceled for User: ${userId}.`);
	}

	/** 3️⃣ User-facing API to cancel subscription */
	async cancelUserSubscription(userId: string) {
		const sub = await this.prisma.subscription.findUnique({ where: { userId } });

		// Allow cancellation if status is 'active' OR 'trialing' (checking for existing lowercase status)
		if (!sub || (sub.status !== 'active' && sub.status !== 'trialing') || !sub.stripeSubscriptionId) {
			throw new NotFoundException('Active or trialing subscription not found or not managed by Stripe.');
		}

		// 1. Cancel in Stripe: set cancel_at_period_end = true
		await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
			cancel_at_period_end: true,
		});

		// 2. Preemptively mark it locally for immediate UI feedback.
		await this.prisma.subscription.update({
			where: { userId },
			// 🎯 FIX: Use consistent lowercase status
			data: { status: 'canceled_at_period_end' }, 
		});
		this.logger.log(`Subscription cancellation scheduled for User: ${userId}. Status set to 'canceled_at_period_end'.`);
	}

	/** Check if user is active subscriber */
	async isActive(userId: string): Promise<boolean> {
		const sub = await this.prisma.subscription.findUnique({
			where: { userId },
		});

		// 🎯 FIX: Check database status against lowercase string.
		if (!sub || sub.status === 'canceled') return false; 

		const now = new Date();
		// Access is granted if the current period hasn't ended yet
		return sub.currentPeriodEnd >= now;
	}

	/**
	 * Fetch full subscription details for the Frontend UI.
	 */
	async getMySubscriptionDetails(userId: string) {
		const userWithSub = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { 
				hasUsedTrial: true, 
				subscriptions: true 
			}
		});

		if (!userWithSub || userWithSub.subscriptions.length === 0) {
			return { 
				status: 'none' as SubscriptionStatusString,
				plan: 'FREE', 
				isPro: false,
				hasUsedTrial: userWithSub?.hasUsedTrial ?? false,
			};
		}
		
		const sub = userWithSub.subscriptions[0];

		// Use the central check for validity
		const isValid = await this.isActive(userId); 

		return {
			status: sub.status, // e.g. 'active', 'trialing', 'canceled_at_period_end' (all lowercase)
			isPro: isValid,
			planAlias: sub.planAlias, // 'PRO_MONTHLY' or 'PRO_YEARLY'
			currentPeriodEnd: sub.currentPeriodEnd, // Date object
			hasUsedTrial: userWithSub.hasUsedTrial,
		};
	}
}