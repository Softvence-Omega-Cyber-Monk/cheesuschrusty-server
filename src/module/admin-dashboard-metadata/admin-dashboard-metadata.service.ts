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


interface DailyUserActivityItem {
  date: string;
  activeUsers: number;
}

interface StudyTimeDistributionItem {
  date: string;
  minutes: number;
}



interface ContentPerformanceItem {
  lesson: string;
  views: number;
}

interface LearningProgressItem {
  level: string;
  users: number;
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

async getAnalyticsData() {
    // 1. Top Stats — 100% REAL
    const totalUsers = await this.prisma.user.count();

    // Daily Active Users (practiced today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyActiveUsers = await this.prisma.user.count({
      where: {
        lastPracticeDate: { gte: todayStart },
      },
    });

    // Avg Study Time Today (real minutes)
    const todaySessions = await this.prisma.practiceSession.aggregate({
      where: { completedAt: { gte: todayStart } },
      _sum: { durationSeconds: true },
    });
    const avgStudyTimeMinutes = dailyActiveUsers > 0
      ? Math.round((todaySessions._sum.durationSeconds || 0) / 60 / dailyActiveUsers)
      : 0;
    const avgStudyTime = `${avgStudyTimeMinutes}m`;

    // Content Completion % (real completed / total published * users)
    const totalPublishedLessons = await this.prisma.lesson.count({
      where: { isPublished: true },
    });
    const totalCompleted = await this.prisma.user.aggregate({
      _sum: { lessonsCompleted: true },
    });
    const contentCompletion = totalPublishedLessons > 0 && totalUsers > 0
      ? Number(((totalCompleted._sum.lessonsCompleted || 0) / (totalUsers * totalPublishedLessons)) * 100).toFixed(1)
      : '0.0';

    // User Retention (active last 7 days / total)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeLast7Days = await this.prisma.user.count({
      where: { lastPracticeDate: { gte: sevenDaysAgo } },
    });
    const userRetention = totalUsers > 0
      ? Number((activeLast7Days / totalUsers) * 100).toFixed(1)
      : '0.0';

    // 2. Daily User Activity (last 7 days) — REAL
    const dailyUserActivity: DailyUserActivityItem[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await this.prisma.user.count({
        where: {
          lastPracticeDate: { gte: date, lt: nextDate },
        },
      });

      dailyUserActivity.push({
        date: date.toISOString().split('T')[0],
        activeUsers: count,
      });
    }

    // 3. Content Performance (top 6 lessons by practice count) — REAL
    const topLessons = await this.prisma.lesson.findMany({
      where: { isPublished: true },
      orderBy: { practiceSessions: { _count: 'desc' } },
      take: 6,
      select: {
        title: true,
        practiceSessions: { select: { id: true } },
      },
    });

    const contentPerformance: ContentPerformanceItem[] = topLessons.map(lesson => ({
      lesson: lesson.title || 'Untitled Lesson',
      views: lesson.practiceSessions.length,
    }));

    // 4. Study Time Distribution (last 7 days total minutes) — REAL
    const studyTimeDistribution: StudyTimeDistributionItem[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const sum = await this.prisma.practiceSession.aggregate({
        where: { completedAt: { gte: date, lt: nextDate } },
        _sum: { durationSeconds: true },
      });

      studyTimeDistribution.push({
        date: date.toISOString().split('T')[0],
        minutes: Math.round((sum._sum.durationSeconds || 0) / 60),
      });
    }

    // 5. Learning Progress by Level — REAL from CEFR confidence cache
    const cefrCache = await this.prisma.cefrConfidenceCache.findMany();

    const levelCounts = {
      beginner: 0,  // A1 + A2
      intermediate: 0, // B1
      advanced: 0,     // B2+
    };

    cefrCache.forEach(entry => {
      const level = entry.cefrLevel;
      if (level === 'A1' || level === 'A2') levelCounts.beginner++;
      else if (level === 'B1') levelCounts.intermediate++;
      else levelCounts.advanced++;
    });

    // Users with no CEFR data = beginners
    const usersWithCefr = new Set(cefrCache.map(c => c.userId));
    const usersWithoutCefr = totalUsers - usersWithCefr.size;
    levelCounts.beginner += usersWithoutCefr;

    const learningProgressByLevel: LearningProgressItem[] = [
      { level: "Beginner (A1-A2)", users: levelCounts.beginner },
      { level: "Intermediate (B1)", users: levelCounts.intermediate },
      { level: "Advanced (B2+)", users: levelCounts.advanced },
    ];

    // 6. Key Insights — REAL & dynamic
    const keyInsights = [
      `${dailyActiveUsers} users practiced today`,
      `Average study time today: ${avgStudyTime}`,
      `${userRetention}% of users active in last 7 days`,
      `Total lessons completed: ${totalCompleted._sum.lessonsCompleted || 0}`,
    ];

    return {
      stats: {
        dailyActiveUsers,
        avgStudyTime,
        contentCompletion: `${contentCompletion}%`,
        userRetention: `${userRetention}%`,
      },
      dailyUserActivity,
      contentPerformance,
      studyTimeDistribution,
      learningProgressByLevel,
      keyInsights,
    };
  }

}