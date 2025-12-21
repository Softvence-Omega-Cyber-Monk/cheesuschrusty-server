// import {
//   BadRequestException,
//   Injectable,
//   NotFoundException,
//   Logger,
// } from '@nestjs/common';
// import { PrismaService } from 'src/common/service/prisma/prisma.service';
// import { lemon } from './lemon-squeezy.client';
// import { verifySignature } from './subscriptions.webhook';
// import { SubscriptionPlan } from '@prisma/client';

// type SubscriptionStatusString =
//   | 'trialing'
//   | 'active'
//   | 'canceled'
//   | 'canceled_at_period_end'
//   | 'expired'
//   | string;

// @Injectable()
// export class SubscriptionService {
//   private readonly logger = new Logger(SubscriptionService.name);

//   constructor(private prisma: PrismaService) {}

//   /* ======================================================
//      1️⃣ CREATE CHECKOUT (Stripe-compatible behavior)
//   ====================================================== */
//   async createCheckout(userId: string, planAlias: string) {
//     const user = await this.prisma.user.findUnique({ where: { id: userId } });
//     if (!user) throw new NotFoundException('User not found');

//     const plan = await this.prisma.plan.findUnique({
//       where: { alias: planAlias },
//     });
//     if (!plan || !plan.isActive) {
//       throw new NotFoundException('Plan not available');
//     }

//     // 🔒 Prevent double subscription
//     const existingSub = await this.prisma.subscription.findUnique({
//       where: { userId },
//     });

//     if (
//       existingSub &&
//       ['active', 'trialing', 'canceled_at_period_end'].includes(
//         existingSub.status,
//       ) &&
//       existingSub.currentPeriodEnd > new Date()
//     ) {
//       throw new BadRequestException(
//         'You already have an active subscription.',
//       );
//     }

//     // 🚫 Trial already used → block PRO checkout
//     if (user.hasUsedTrial && plan.alias.includes('PRO')) {
//       throw new BadRequestException(
//         'Trial already used. Please purchase a full plan.',
//       );
//     }

//     const res = await lemon.post('/checkouts', {
//       data: {
//         type: 'checkouts',
//         attributes: {
//           checkout_data: {
//             email: user.email,
//             custom: {
//               userId: user.id,
//               planAlias: plan.alias,
//             },
//           },
//         },
//         relationships: {
//           store: {
//             data: {
//               type: 'stores',
//               id: process.env.LEMON_SQUEEZY_STORE_ID,
//             },
//           },
//           variant: {
//             data: {
//               type: 'variants',
//               id: plan.lemonVariantId,
//             },
//           },
//         },
//       },
//     });

//     const checkoutData = res.data.data.attributes;
//     const lemonCustomerId = checkoutData.customer_id?.toString();

//     // 🎯 Store Lemon Squeezy customer ID in User table if not already
//     if (lemonCustomerId && !user.lemonCustomerId) {
//       await this.prisma.user.update({
//         where: { id: user.id },
//         data: { lemonCustomerId },
//       });
//     }

//     return { checkoutUrl: checkoutData.url };
//   }

//   /* ======================================================
//      2️⃣ WEBHOOK HANDLER (Stripe parity)
//   ====================================================== */
//   async handleWebhook(rawBody: string, signature: string, payload: any) {
//     if (!verifySignature(rawBody, signature)) {
//       throw new Error('Invalid webhook signature');
//     }

//     const event = payload.meta?.event_name;
//     const meta = payload.meta?.custom_data;
//     const attrs = payload.data?.attributes;

//     if (!meta?.userId) return;

//     const userId = meta.userId;
//     const lemonSubscriptionId = payload.data.id.toString();
//     const lemonCustomerId = attrs.customer_id?.toString();

//     const periodStart = new Date(attrs.created_at);
//     const periodEnd = attrs.renews_at
//       ? new Date(attrs.renews_at)
//       : new Date(attrs.created_at);

//     /* -------------------------------
//        subscription_created / updated
//     -------------------------------- */
//     if (event === 'subscription_created' || event === 'subscription_updated') {
//       const dbStatus: SubscriptionStatusString =
//         attrs.status === 'on_trial'
//           ? 'trialing'
//           : attrs.status === 'active'
//           ? 'active'
//           : attrs.status;

//       // 🎯 Mark trial used (Stripe parity)
//       if (dbStatus === 'trialing' || dbStatus === 'active') {
//         await this.prisma.user.update({
//           where: { id: userId },
//           data: { hasUsedTrial: true },
//         });
//       }

//       // 🎯 Store Lemon customer ID on User table if not exists
//       if (lemonCustomerId) {
//         await this.prisma.user.update({
//           where: { id: userId },
//           data: { lemonCustomerId },
//         });
//       }

//       await this.prisma.subscription.upsert({
//         where: { lemonSubscriptionId },
//         update: {
//           userId,
//           lemonCustomerId,
//           status: dbStatus,
//           plan: SubscriptionPlan.PRO,
//           planAlias: meta.planAlias,
//           currentPeriodStart: periodStart,
//           currentPeriodEnd: periodEnd,
//         },
//         create: {
//           userId,
//           lemonSubscriptionId,
//           lemonCustomerId,
//           status: dbStatus,
//           plan: SubscriptionPlan.PRO,
//           planAlias: meta.planAlias,
//           currentPeriodStart: periodStart,
//           currentPeriodEnd: periodEnd,
//         },
//       });

//       this.logger.log(
//         `Subscription ${dbStatus} for user ${userId} (${meta.planAlias})`,
//       );
//     }

//     /* -------------------------------
//        subscription_cancelled
//     -------------------------------- */
//     if (event === 'subscription_cancelled') {
//       await this.prisma.subscription.updateMany({
//         where: { lemonSubscriptionId },
//         data: { status: 'canceled_at_period_end' },
//       });

//       this.logger.log(`Subscription cancellation scheduled: ${userId}`);
//     }
//   }

//   /* ======================================================
//      3️⃣ USER CANCEL (Stripe-compatible UX)
//   ====================================================== */
//   async cancelUserSubscription(userId: string) {
//     const sub = await this.prisma.subscription.findUnique({
//       where: { userId },
//     });

//     if (
//       !sub ||
//       !sub.lemonSubscriptionId ||
//       !['active', 'trialing'].includes(sub.status)
//     ) {
//       throw new NotFoundException('Active subscription not found');
//     }

//     await lemon.delete(`/subscriptions/${sub.lemonSubscriptionId}`);

//     await this.prisma.subscription.update({
//       where: { userId },
//       data: { status: 'canceled_at_period_end' },
//     });
//   }

//   /* ======================================================
//      4️⃣ SAME RESPONSE SHAPE FOR FRONTEND
//   ====================================================== */
//   async isActive(userId: string): Promise<boolean> {
//     const sub = await this.prisma.subscription.findUnique({
//       where: { userId },
//     });

//     if (!sub || sub.status === 'canceled') return false;
//     return sub.currentPeriodEnd >= new Date();
//   }


// async getMySubscriptionDetails(userId: string) {
//   const user = await this.prisma.user.findUnique({
//     where: { id: userId },
//     include: { subscriptions: true },
//   });

//   if (!user || !user.subscriptions || user.subscriptions.length === 0) {
//     return {
//       status: 'none',
//       plan: 'FREE',
//       isPro: false,
//       hasUsedTrial: user?.hasUsedTrial ?? false,
//     };
//   }

//   const sub = user.subscriptions[0]; // one active sub per user

//   // Ensure currentPeriodEnd exists before comparison
//   const isPro =
//     sub.currentPeriodEnd instanceof Date && sub.currentPeriodEnd >= new Date();

//   return {
//     status: sub.status ?? 'none',
//     planAlias: sub.planAlias ?? 'FREE',
//     isPro,
//     currentPeriodEnd: sub.currentPeriodEnd ?? null,
//     hasUsedTrial: user.hasUsedTrial,
//   };
// }

// }



import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { lemon } from './lemon-squeezy.client';
import { verifySignature } from './subscriptions.webhook';
import { SubscriptionPlan } from '@prisma/client';

type SubscriptionStatusString =
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'canceled_at_period_end'
  | 'expired'
  | string;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private prisma: PrismaService) {}

  /* ======================================================
     1️⃣ CREATE CHECKOUT (with Lemon customer ID)
  ====================================================== */
  async createCheckout(userId: string, planAlias: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const plan = await this.prisma.plan.findUnique({
      where: { alias: planAlias },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not available');
    }

    // Prevent double subscription
    const existingSub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (
      existingSub &&
      ['active', 'trialing', 'canceled_at_period_end'].includes(
        existingSub.status,
      ) &&
      existingSub.currentPeriodEnd > new Date()
    ) {
      throw new BadRequestException(
        'You already have an active subscription.',
      );
    }

    // Block PRO checkout if trial already used
    if (user.hasUsedTrial && plan.alias.includes('PRO')) {
      throw new BadRequestException(
        'Trial already used. Please purchase a full plan.',
      );
    }

    // Create checkout on Lemon
    const res = await lemon.post('/checkouts', {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: user.email,
            custom: {
              userId: user.id,
              planAlias: plan.alias,
            },
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: process.env.LEMON_SQUEEZY_STORE_ID,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: plan.lemonVariantId,
            },
          },
        },
      },
    });

    const checkoutData = res.data.data.attributes;
    const lemonCustomerId = checkoutData.customer_id?.toString();

    // Store Lemon customer ID if not already set
    if (lemonCustomerId && !user.lemonCustomerId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lemonCustomerId },
      });
    }

    return { checkoutUrl: checkoutData.url };
  }

  /* ======================================================
     2️⃣ WEBHOOK HANDLER (with customer ID storage)
  ====================================================== */
  async handleWebhook(rawBody: string, signature: string, payload: any) {
    if (!verifySignature(rawBody, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const event = payload.meta?.event_name;
    const meta = payload.meta?.custom_data;
    const attrs = payload.data?.attributes;

    if (!meta?.userId) return;

    const userId = meta.userId;
    const lemonSubscriptionId = payload.data.id.toString();
    const lemonCustomerId = attrs.customer_id?.toString();

    const periodStart = new Date(attrs.created_at);
    const periodEnd = attrs.renews_at
      ? new Date(attrs.renews_at)
      : new Date(attrs.created_at);

    /* subscription_created / updated */
    if (event === 'subscription_created' || event === 'subscription_updated') {
      const dbStatus: SubscriptionStatusString =
        attrs.status === 'on_trial'
          ? 'trialing'
          : attrs.status === 'active'
          ? 'active'
          : attrs.status;

      // Mark trial used
      if (dbStatus === 'trialing' || dbStatus === 'active') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { hasUsedTrial: true },
        });
      }

      // Store Lemon customer ID if not exists
      if (lemonCustomerId) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { lemonCustomerId },
        });
      }

      await this.prisma.subscription.upsert({
        where: { lemonSubscriptionId },
        update: {
          userId,
          lemonCustomerId,
          status: dbStatus,
          plan: SubscriptionPlan.PRO,
          planAlias: meta.planAlias,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        create: {
          userId,
          lemonSubscriptionId,
          lemonCustomerId,
          status: dbStatus,
          plan: SubscriptionPlan.PRO,
          planAlias: meta.planAlias,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      this.logger.log(
        `Subscription ${dbStatus} for user ${userId} (${meta.planAlias})`,
      );
    }

    /* subscription_cancelled */
    if (event === 'subscription_cancelled') {
      // Only update status, leave currentPeriodEnd as-is for UI parity
      await this.prisma.subscription.updateMany({
        where: { lemonSubscriptionId },
        data: { status: 'canceled_at_period_end' },
      });

      this.logger.log(`Subscription cancellation scheduled: ${userId}`);
    }
  }

  /* ======================================================
     3️⃣ USER CANCEL (Stripe parity)
  ====================================================== */
  async cancelUserSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!sub || !['active', 'trialing'].includes(sub.status)) {
      throw new NotFoundException('Active subscription not found');
    }

    // Cancel subscription in Lemon
    await lemon.delete(`/subscriptions/${sub.lemonSubscriptionId}`);

    // Only update status locally
    await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'canceled_at_period_end' },
    });

    this.logger.log(`Subscription cancellation scheduled for User: ${userId}`);
  }

  /* ======================================================
     4️⃣ CHECK ACTIVE STATUS
  ====================================================== */
  async isActive(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!sub || sub.status === 'canceled') return false;

    return sub.currentPeriodEnd instanceof Date && sub.currentPeriodEnd >= new Date();
  }

  /* ======================================================
     5️⃣ GET SUBSCRIPTION DETAILS
  ====================================================== */
  async getMySubscriptionDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    });

    if (!user || !user.subscriptions || user.subscriptions.length === 0) {
      return {
        status: 'none',
        plan: 'FREE',
        isPro: false,
        hasUsedTrial: user?.hasUsedTrial ?? false,
      };
    }

    const sub = user.subscriptions[0];

    const isPro =
      sub.currentPeriodEnd instanceof Date && sub.currentPeriodEnd >= new Date();

    return {
      status: sub.status ?? 'none',
      planAlias: sub.planAlias ?? 'FREE',
      isPro,
      currentPeriodEnd: sub.currentPeriodEnd ?? null,
      hasUsedTrial: user.hasUsedTrial,
    };
  }
}

























