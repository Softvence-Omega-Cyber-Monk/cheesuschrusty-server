// src/module/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
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
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async getDashboardData() {
    // 1. Total Users
    const totalUsers = await this.prisma.user.count();

    // 2. Active Users (isActive: true — account active, not blocked)
    const activeUsers = await this.prisma.user.count({
      where: {
        isActive: true,
      },
    });

    // 3. Pro Subscribers
    const proSubscribers = await this.prisma.subscription.count({
      where: {
        status: 'active',
        plan: 'PRO',
      },
    });

    // 4. Monthly Revenue (placeholder — replace with real Stripe data later)
    const monthlyRevenue = proSubscribers * 10;

    // 5. Users Overview (last 12 months)
    const usersOverview: UsersOverviewItem[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);

      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const totalInMonth = await this.prisma.user.count({
        where: {
          createdAt: { lt: nextMonth },
        },
      });

      const newInMonth = await this.prisma.user.count({
        where: {
          createdAt: { gte: date, lt: nextMonth },
        },
      });

      usersOverview.push({
        month: date.toLocaleString('default', { month: 'short' }),
        totalUsers: totalInMonth,
        newUsers: newInMonth,
      });
    }

    // 6. Recent Activity
    const recentActivity: RecentActivityItem[] = [];

    // New users
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

    // New subscriptions
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

    // Support tickets
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

    // Sort by timestamp (latest first)
    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivityLimited = recentActivity.slice(0, 10);

    // 7. Subscription Breakdown
    const freeUsers = totalUsers - proSubscribers;
    const premiumPercentage = totalUsers > 0 ? Math.round((proSubscribers / totalUsers) * 100) : 0;

    return {
      stats: {
        totalUsers,
        activeUsers,
        proSubscribers,
        monthlyRevenue,
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