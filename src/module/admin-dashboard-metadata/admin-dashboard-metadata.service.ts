// src/module/admin/admin.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';

interface UsersOverviewItem {
  month: string;
  totalUsers: number;
  newUsers: number;
}

interface RecentActivityItem {
  type: 'user' | 'subscription' | 'ticket';
  message: string;
  timestamp: Date;
}

@Injectable()
export class AdminDashboardMetadataService {
  private readonly logger = new Logger(AdminDashboardMetadataService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

 async getDashboardData() {
  // 1. Total Users
  const totalUsers = await this.prisma.user.count();

  // 2. Active Users (account active)
  const activeUsers = await this.prisma.user.count({
    where: { isActive: true },
  });

  // 3. Active Pro Subscribers
  const proSubscribers = await this.prisma.subscription.count({
    where: {
      status: 'active',
      plan: 'PRO',
    },
  });

  // 4. Real Revenue — ONLY from your app's subscriptions
  let totalRevenue = 0;
  let monthlyRevenue = 0;

  try {
    // Get all Stripe subscription IDs from your database
    const appSubscriptions = await this.prisma.subscription.findMany({
      select: { stripeSubscriptionId: true },
      where: { stripeSubscriptionId: { not: null } },
    });

    const subscriptionIds = appSubscriptions
      .map(s => s.stripeSubscriptionId!)
      .filter(Boolean);

    if (subscriptionIds.length > 0) {
      const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

      // Monthly revenue — loop over each subscription
      for (const subId of subscriptionIds) {
        const invoices = await this.subscriptionService.stripe.invoices.list({
          subscription: subId,
          status: 'paid',
          created: { gte: thirtyDaysAgo },
          limit: 100,
        });
        monthlyRevenue += invoices.data.reduce((sum, inv) => sum + inv.amount_paid, 0) / 100;
      }

      // Total revenue — all time
      for (const subId of subscriptionIds) {
        const invoices = await this.subscriptionService.stripe.invoices.list({
          subscription: subId,
          status: 'paid',
          limit: 100,
        });
        totalRevenue += invoices.data.reduce((sum, inv) => sum + inv.amount_paid, 0) / 100;
      }
    }
  } catch (error) {
    this.logger.warn('Failed to fetch revenue from Stripe', error);
    totalRevenue = 0;
    monthlyRevenue = 0;
  }

  // 5. Average Revenue Per Paying User (ARPU)
  const arpu = proSubscribers > 0 
    ? Number((monthlyRevenue / proSubscribers).toFixed(2)) 
    : 0;

  // 6. Users Overview (last 12 months)
  const usersOverview: UsersOverviewItem[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(1);

    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const totalInMonth = await this.prisma.user.count({
      where: { createdAt: { lt: nextMonth } },
    });

    const newInMonth = await this.prisma.user.count({
      where: { createdAt: { gte: date, lt: nextMonth } },
    });

    usersOverview.push({
      month: date.toLocaleString('default', { month: 'short' }),
      totalUsers: totalInMonth,
      newUsers: newInMonth,
    });
  }

  // 7. Recent Activity
  const recentActivity: RecentActivityItem[] = [];

  const newUsers = await this.prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { name: true, email: true, createdAt: true },
  });
  newUsers.forEach(u => {
    recentActivity.push({
      type: 'user',
      message: `New user registration: ${u.name?.trim() || u.email}`,
      timestamp: u.createdAt,
    });
  });

  const newSubs = await this.prisma.subscription.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { name: true, email: true } } },
  });
  newSubs.forEach(s => {
    recentActivity.push({
      type: 'subscription',
      message: `New Pro subscription: ${s.user.name?.trim() || s.user.email}`,
      timestamp: s.createdAt,
    });
  });

  const tickets = await this.prisma.supportTicket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { name: true, email: true } } },
  });
  tickets.forEach(t => {
    recentActivity.push({
      type: 'ticket',
      message: `Support request: ${t.subject} from ${t.user.name?.trim() || t.user.email}`,
      timestamp: t.createdAt,
    });
  });

  recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const recentActivityLimited = recentActivity.slice(0, 10);

  // 8. Subscription Breakdown
  const freeUsers = totalUsers - proSubscribers;
  const premiumPercentage = totalUsers > 0 ? Math.round((proSubscribers / totalUsers) * 100) : 0;

  return {
    stats: {
      totalUsers,
      activeUsers,
      proSubscribers,
      totalRevenue,
      monthlyRevenue,
      arpu,
    },
    usersOverview,
    recentActivity: recentActivityLimited,
    subscriptionBreakdown: {
      freeUsers,
      proSubscribers,
      premiumPercentage,
    },
  };
}



}