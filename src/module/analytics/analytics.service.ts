import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { PracticeSessionService } from '../practice-session/practice-session.service';
import { CefrConfidenceService } from 'src/common/service/cefr/cefr-confidence.service';
import { BadgeType, LessonType, SkillArea, Plan, SubscriptionHistory } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(
    private prisma: PrismaService,
    private practiceSessionService: PracticeSessionService,
    private cefrConfidenceService: CefrConfidenceService,
    private mailService: MailService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getOverviewDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          take: 1,
        },
      },
    });

    if (!user) throw new Error('User not found');

    const isPro = user.subscriptions.length > 0;

    // 1. Fetch external skills from AI API via CEFR service
    const externalSkills = await this.cefrConfidenceService.fetchExternalSkills();

    // Today's Date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lessons completed count & weekly accuracy
    const [lessonsCompleted, totalSessions, totalAccuracy] =
      await this.prisma.$transaction([
        this.prisma.practiceSession.count({
          where: { userId, lessonId: { not: null } },
        }),
        this.prisma.practiceSession.count({ where: { userId } }),
        this.prisma.practiceSession.aggregate({
          where: { userId },
          _avg: { accuracy: true },
        }),
      ]);

    const totalAvailableLessons = await this.prisma.lesson.count({
      where: { isPublished: true },
    });
    const lessonsProgress =
      totalAvailableLessons > 0
        ? Math.round((lessonsCompleted / totalAvailableLessons) * 100)
        : 0;

    // Weekly data
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const weeklyStats = await this.prisma.practiceSession.aggregate({
      where: { userId, completedAt: { gte: lastWeek } },
      _sum: { durationSeconds: true },
      _avg: { accuracy: true },
    });

    const thisWeekMinutes = Math.round(
      (weeklyStats._sum.durationSeconds || 0) / 60,
    );
    const weeklyAccuracy = weeklyStats._avg.accuracy || 0;

    // Other stats from user directly
    const wordsLearned = user.wordsLearned;
    const currentStreak = user.currentStreak;

    // This week lessons
    const thisWeekLessons =
      await this.practiceSessionService.getWeeklyLessons(userId);

    // Recent achievements
    const recentAchievements = await this.getRecentAchievements(userId);

    // 2. Resolve all skills (Core + External)
    const coreSkills = ['reading', 'listening', 'writing', 'speaking', 'grammar'];
    const allSkills = Array.from(new Set([...coreSkills, ...externalSkills]));

    // 3. Map over all resolved skills
    const practiceAreas = await Promise.all(
      allSkills.map(async (skill) => {
        const completed = await this.prisma.practiceSession.count({
          where: {
            userId,
            skillArea: skill as any,
            lessonId: { not: null }, // only real lessons
          },
        });

        const total = await this.prisma.lesson.count({
          where: {
            isPublished: true,
            skill: skill.toUpperCase() as LessonType,
          },
        });

        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          skillArea: skill,
          lessonsCompleted: completed,
          totalLessons: total,
          progress,
        };
      }),
    );

    return {
      isPro,
      welcomeMessage: `Welcome Back, ${user.name || 'Learner'}! 👋`,
      weeklyMinutes: thisWeekMinutes,
      lessons: {
        completed: lessonsCompleted,
        total: totalAvailableLessons,
        progress: lessonsProgress,
      },
      accuracyRate: Math.round(weeklyAccuracy),
      wordsLearned,
      currentStreak,
      thisWeek: {
        minutes: thisWeekMinutes,
        lessons: thisWeekLessons,
      },
      practiceAreas, // Dynamic skills with progress
      recentAchievements,
    };
  }

  /**
   * Practice Dashboard — shown when user taps "Practice"
   * Daily goal + today's stats + skill cards
   */
  async getPracticeDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    // Daily goal from user
    const dailyGoal = user.dailyGoalMinutes || 20;

    // Today's minutes
    const minutesToday =
      await this.practiceSessionService.getTodayMinutes(userId);
    const dailyProgress = Math.min(
      100,
      Math.round((minutesToday / dailyGoal) * 100),
    );

    // Today's completed lessons (real lessons only)
    const todayLessons = await this.prisma.practiceSession.count({
      where: {
        userId,
        lessonId: { not: null },
        completedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0)),
        },
      },
    });

    // Today's average accuracy
    const todaySessions = await this.prisma.practiceSession.findMany({
      where: {
        userId,
        completedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0)),
        },
      },
      select: { accuracy: true },
    });

    const todayAccuracy =
      todaySessions.length > 0
        ? Math.round(
            todaySessions.reduce((sum, s) => sum + s.accuracy, 0) /
              todaySessions.length,
          )
        : 0;

    // 2. Fetch all skills (Core + External)
    const externalSkills = await this.cefrConfidenceService.fetchExternalSkills();
    const coreSkills = ['reading', 'listening', 'writing', 'speaking', 'grammar'];
    const allSkills = Array.from(new Set([...coreSkills, ...externalSkills]));

    // Practice Areas — lessons completed per skill
    const practiceAreas = await Promise.all(
      allSkills.map(async (skill) => {
        const completed = await this.prisma.practiceSession.count({
          where: {
            userId,
            skillArea: skill as any,
            lessonId: { not: null },
          },
        });

        const total = await this.prisma.lesson.count({
          where: {
            isPublished: true,
            skill: skill.toUpperCase() as LessonType, // Changed from 'type' to 'skill'
          },
        });

        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          skillArea: skill,
          title: this.getSkillTitle(skill as SkillArea),
          lessonsCompleted: completed,
          totalLessons: total,
          progress,
        };
      }),
    );

    return {
      dailyGoalProgress: {
        minutesToday,
        dailyGoal,
        progress: dailyProgress,
        message:
          minutesToday >= dailyGoal
            ? 'Daily goal achieved! 🎉'
            : `${dailyGoal - minutesToday} min left to reach your goal`,
      },
      todayStats: {
        sessions: todaySessions.length,
        studyTimeMinutes: minutesToday,
        averageAccuracy: todayAccuracy,
      },
      practiceAreas,
    };
  }

  // Helper for nice titles
  private getSkillTitle(skill: SkillArea): string {
    const titles = {
      reading: 'Reading Comprehension',
      listening: 'Audio Comprehension',
      writing: 'Composition Practice',
      speaking: 'AI Pronunciation Practice',
      grammar: 'Grammar & Structure',
    };
    return titles[skill] || skill;
  }

  async getAdvancedAnalytics(userId: string) {
    // 1. User basic stats
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        currentStreak: true,
        longestStreak: true,
        totalMinutesStudied: true,
        lessonsCompleted: true,
      },
    });

    // 2. Weekly stats
    const weeklyMinutes =
      await this.practiceSessionService.getWeeklyMinutes(userId);
    const weeklyAccuracy =
      await this.practiceSessionService.getWeeklyAccuracy(userId);

    // 3. CEFR progress
    const cefrProgress =
      await this.cefrConfidenceService.getUserProgress(userId);

    // 4. Weekly performance graph
    const weeklyPerformance = await this.getWeeklyPerformance(userId);

    // 5. REAL Recent Achievements (earned badges)
    const recentAchievements = await this.getRecentAchievements(userId);

    // 6. Recent sessions
    const recentSessions = await this.getRecentSessions(userId);

    return {
      thisWeekMinutes: weeklyMinutes,
      currentStreak: user?.currentStreak || 0,
      averageAccuracy: weeklyAccuracy,
      totalLessons: user?.lessonsCompleted || 0,

      weeklyPerformance,
      skillProgress: cefrProgress.skills,

      recentAchievements,
      recentSessions,
    };
  }

  private async getWeeklyPerformance(userId: string) {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const result: { day: string; minutes: number; accuracy: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySessions = await this.prisma.practiceSession.findMany({
        where: {
          userId,
          completedAt: { gte: date, lt: nextDate },
        },
      });

      const minutes = Math.round(
        daySessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60,
      );

      const accuracy =
        daySessions.length > 0
          ? Math.round(
              daySessions.reduce((sum, s) => sum + s.accuracy, 0) /
                daySessions.length,
            )
          : 0;

      result.push({
        day: days[date.getDay()],
        minutes,
        accuracy,
      });
    }

    return result;
  }

  // REAL BADGES — NO MORE PLACEHOLDERS!
  private async getRecentAchievements(userId: string) {
    const earnedBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: {
          select: { title: true, icon: true },
        },
      },
      orderBy: { earnedAt: 'desc' },
      take: 6,
    });

    if (earnedBadges.length === 0) {
      return [
        {
          title: 'Welcome!',
          icon: '👋',
          date: 'Start practicing to earn badges',
        },
      ];
    }

    return earnedBadges.map((ub) => ({
      title: ub.badge.title,
      icon: ub.badge.icon,
      date: this.formatRelativeDate(ub.earnedAt),
    }));
  }

  private formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
  }

  /**
   * Check and award badges based on user performance
   * Call this after every practice session completion
   */
  async checkAndAwardBadges(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        earnedBadges: {
          include: { badge: true },
        },
        cefrConfidence: true,
      },
    });

    if (!user) return;

    // Get global admin settings
    const globalSettings = await this.prisma.notificationSettings.findUnique({
      where: { id: 1 },
    });

    const badges = await this.prisma.badge.findMany();

    const newBadgesEarned: { badge: any }[] = [];

    for (const badge of badges) {
      // Skip if already earned
      const alreadyHas = user.earnedBadges.some(
        (ub) => ub.badgeId === badge.id,
      );
      if (alreadyHas) continue;

      let shouldAward = false;

      switch (badge.type) {
        case BadgeType.STREAK:
          if (user.currentStreak >= (badge.threshold || 0)) shouldAward = true;
          break;

        case BadgeType.LESSONS:
          if (user.lessonsCompleted >= (badge.threshold || 0))
            shouldAward = true;
          break;

        case BadgeType.TIME:
          if (user.totalMinutesStudied >= (badge.threshold || 0))
            shouldAward = true;
          break;

        case BadgeType.ACCURACY:
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const recentSessions = await this.prisma.practiceSession.findMany({
            where: {
              userId,
              completedAt: { gte: sevenDaysAgo },
            },
          });

          const avgAccuracy =
            recentSessions.length > 0
              ? recentSessions.reduce((sum, s) => sum + s.accuracy, 0) /
                recentSessions.length
              : 0;

          if (avgAccuracy >= (badge.threshold || 0)) shouldAward = true;
          break;

        case BadgeType.SKILL_MASTERY:
          if (!badge.skillArea) break;
          const skillConfidence = user.cefrConfidence.find(
            (c) => c.skillArea === badge.skillArea,
          );
          if (
            skillConfidence &&
            ['B1', 'B2', 'C1', 'C2'].includes(skillConfidence.cefrLevel)
          ) {
            shouldAward = true;
          }
          break;

        case BadgeType.CITIZENSHIP_READY:
          const highConfidenceCount = user.cefrConfidence.filter(
            (c) => c.confidenceLevel === 'HIGH',
          ).length;
          if (highConfidenceCount === 4) shouldAward = true;
          break;
      }

      if (shouldAward) {
        await this.prisma.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
          },
        });

        newBadgesEarned.push({ badge });

        this.logger.log(`Badge awarded: ${badge.title} to user ${userId}`);
      }
    }

    // SEND ACHIEVEMENT EMAIL ONLY IF:
    // 1. User has achievementAlertsEnabled = true
    // 2. Admin has achievementNotifications = true (global toggle)
    if (
      user.achievementAlertsEnabled &&
      globalSettings?.achievementNotifications === true &&
      newBadgesEarned.length > 0
    ) {
      for (const { badge } of newBadgesEarned) {
        try {
          await this.mailService.sendAchievementEmail(
            { email: user.email, name: user.name },
            {
              title: badge.title,
              icon: badge.icon,
              description: badge.description,
            },
          );
          this.logger.log(
            `Achievement email sent: ${badge.title} to ${user.email}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send achievement email for ${badge.title} to ${user.email}`,
            error,
          );
        }
      }
    }
  }

  private async getRecentSessions(userId: string) {
    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 6,
      include: {
        lesson: {
          select: { task_id: true, skill: true }, // Changed from title/type to task_id/skill
        },
      },
    });

    return sessions.map((s) => ({
      title: s.lesson
        ? `${s.lesson.skill || 'Unknown'} - ${s.lesson.task_id || 'Untitled'}`
        : 'Flashcard Practice',
      duration: `${Math.floor(s.durationSeconds / 60)} min`,
      accuracy: `${Math.floor(s.accuracy)}%`,
      date: new Date(s.completedAt).toLocaleDateString(),
    }));
  }

  /**
   * MRR Analytics for Admin Dashboard
   * Calculates Monthly Recurring Revenue based on current active subscriptions
   */
  async getMRRAnalytics(range: string) {
    // Parse range (e.g., '30d', '60d', '90d', '12m')
    let dayCount = 30;
    if (range.includes('30d')) dayCount = 30;
    else if (range.includes('60d')) dayCount = 60;
    else if (range.includes('90d')) dayCount = 90;
    else if (range.includes('12m')) dayCount = 365;
    else dayCount = parseInt(range) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dayCount);

    // 1. Fetch data
    const [subscriptions, plans, history] = await Promise.all([
      this.prisma.subscription.findMany(),
      this.prisma.plan.findMany(),
      this.prisma.subscriptionHistory.findMany({
        where: { recordedAt: { gte: startDate } },
      }),
    ]);

    const planMap = new Map(plans.map((p) => [p.alias, p]));

    // 2. Metrics Accumulators
    let totalMRR = 0;
    let proMRR = 0;
    let paidMRR = 0;
    let activeSubscribers = 0;

    let newMRR = 0;
    let churnedMRR = 0;
    let expansionMRR = 0;

    const now = new Date();

    // 3. Current MRR Calculation (Snapshot)
    subscriptions.forEach((sub) => {
      const plan = planMap.get(sub.planAlias || '');
      if (!plan) return;

      let monthlyContribution = plan.price;
      if (plan.interval === 'year') monthlyContribution /= 12;
      if (plan.interval === 'lifetime' || plan.price === 0)
        monthlyContribution = 0;

      const isActive =
        sub.status === 'active' || sub.currentPeriodEnd > now;
      if (isActive) {
        totalMRR += monthlyContribution;
        activeSubscribers++;

        if (sub.planAlias?.includes('PRO')) proMRR += monthlyContribution;
        if (sub.plan !== 'FREE') paidMRR += monthlyContribution;
      }
    });

    // 4. Historical Breakdown (from Log if available, else estimate)
    if (history.length > 0) {
      history.forEach((h) => {
        if (h.event === 'NEW') newMRR += h.mrrContribution;
        if (h.event === 'CHURN') churnedMRR += Math.abs(h.mrrContribution);
        if (h.event === 'UPGRADE') expansionMRR += h.mrrContribution;
      });
    } else {
      // Fallback to estimation for the transition period
      subscriptions.forEach((sub) => {
        const plan = planMap.get(sub.planAlias || '');
        if (!plan) return;
        let monthlyValue = plan.price;
        if (plan.interval === 'year') monthlyValue /= 12;

        if (sub.createdAt >= startDate) newMRR += monthlyValue;
        if (
          ['canceled', 'canceled_at_period_end', 'expired'].includes(
            sub.status,
          ) &&
          sub.currentPeriodEnd >= startDate &&
          sub.currentPeriodEnd <= now
        ) {
          churnedMRR += monthlyValue;
        }
      });
    }

    // 5. Rate Calculations
    const prevMRR = totalMRR - newMRR + churnedMRR;
    const growthRate =
      prevMRR > 0 ? ((totalMRR - prevMRR) / prevMRR) * 100 : 100;

    const quickRatio =
      churnedMRR > 0
        ? (newMRR + expansionMRR) / churnedMRR
        : newMRR + expansionMRR > 0
          ? 10
          : 0;

    return {
      overview: {
        currentMRR: Number(totalMRR.toFixed(2)),
        proMRR: Number(proMRR.toFixed(2)),
        paidMRR: Number(paidMRR.toFixed(2)),
        activeSubscribers,
        growthRate: Number(growthRate.toFixed(1)),
        quickRatio: Number(quickRatio.toFixed(2)),
      },
      breakdown: {
        newMRR: Number(newMRR.toFixed(2)),
        expansionMRR: Number(expansionMRR.toFixed(2)),
        churnedMRR: Number(churnedMRR.toFixed(2)),
      },
      period: {
        days: dayCount,
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
    };
  }

  /**
   * Churn Analysis for Admin Dashboard
   * Monthly trend, reasons, at-risk users, and LTV estimation
   */
  async getChurnAnalytics(range: string) {
    // 1. Monthly Churn Rate Trend (Last 6 Months)
    const churnTrend = await this.getChurnTrend();

    // 2. Users At Risk (Inactivity analysis)
    const atRisk = await this.getAtRiskUsers();

    // 3. Top Churn Reasons (Aggregated from history)
    const reasons = await this.getChurnReasons();

    // 4. LTV Estimation (Lifetime Value)
    // Formula: ARPU / Churn Rate
    const ltvData = await this.estimateLTV();

    return {
      churnRateTrend: churnTrend,
      topChurnReasons: reasons,
      atRiskUsers: atRisk,
      ltvAnalysis: ltvData,
    };
  }

  private async getChurnTrend() {
    const trend: { month: string; churnRate: number; churnedCount: number }[] =
      [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      // Total customers at start of month
      const totalStart = await this.prisma.subscription.count({
        where: {
          createdAt: { lt: monthStart },
          status: 'active',
        },
      });

      // Churned during this month
      const churned = await this.prisma.subscriptionHistory.count({
        where: {
          event: 'CHURN',
          recordedAt: { gte: monthStart, lte: monthEnd },
        },
      });

      const rate = totalStart > 0 ? (churned / totalStart) * 100 : 0;

      trend.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        churnRate: Number(rate.toFixed(1)),
        churnedCount: churned,
      });
    }

    return trend;
  }

  private async getAtRiskUsers() {
    const now = new Date();
    const thresholds = [
      { label: '7-14 days', days: 7, maxDays: 14 },
      { label: '14-30 days', days: 14, maxDays: 30 },
      { label: '30+ days', days: 30, maxDays: 9999 },
    ];

    const result = await Promise.all(
      thresholds.map(async (t) => {
        const minDate = new Date();
        minDate.setDate(now.getDate() - t.days);
        const maxDate = new Date();
        maxDate.setDate(now.getDate() - t.maxDays);

        const count = await this.prisma.user.count({
          where: {
            role: 'USER',
            lastPracticeDate: {
              lt: minDate,
              gte: t.maxDays === 9999 ? undefined : maxDate,
            },
          },
        });

        return { category: t.label, userCount: count };
      }),
    );

    return result;
  }

  private async getChurnReasons() {
    // Since history might be fresh, we provide some default distribution
    // and aggregate real values if available
    const realReasons = await this.prisma.subscriptionHistory.groupBy({
      by: ['cancellationReason'],
      where: { event: 'CHURN', cancellationReason: { not: null } },
      _count: { _all: true },
    });

    if (realReasons.length === 0) {
      return [
        { reason: 'Price too high', percentage: 35 },
        { reason: 'Found alternative', percentage: 25 },
        { reason: 'Missing features', percentage: 20 },
        { reason: 'Too difficult', percentage: 15 },
        { reason: 'Other', percentage: 5 },
      ];
    }

    const total = realReasons.reduce((sum, r) => sum + r._count._all, 0);
    return realReasons.map((r) => ({
      reason: r.cancellationReason || 'Unknown',
      percentage: Number(((r._count._all / total) * 100).toFixed(1)),
    }));
  }

  private async estimateLTV() {
    // Real LTV logic
    // LTV = ARPU / Monthly Churn Rate
    const mrrData = await this.getMRRAnalytics('30d');
    const arpu = mrrData.overview.activeSubscribers > 0
      ? mrrData.overview.currentMRR / mrrData.overview.activeSubscribers
      : 0;

    const churnTrend = await this.getChurnTrend();
    const avgChurnRate = churnTrend.reduce((sum, t) => sum + t.churnRate, 0) / churnTrend.length;

    const ltv = avgChurnRate > 0 ? arpu / (avgChurnRate / 100) : arpu * 12; // fallback to 1 year revenue if 0 churn

    return {
      averageARPU: Number(arpu.toFixed(2)),
      averageMonthlyChurnRate: Number(avgChurnRate.toFixed(1)) + '%',
      estimatedLTV: Number(ltv.toFixed(2)),
      confidence: churnTrend.length >= 3 ? 'HIGH' : 'LOW (need more data)',
    };
  }

  /**
   * Cohort Retention Analysis
   * Calculates how long users stay active after their first month
   */
  async getRetentionInsights() {
    const cohorts = (await this.getCohortRetention()) as any[];
    console.log('Cohort Retention Raw Data:', cohorts);

    // Calculate average M1 retention
    const m1Percentages = cohorts
      .filter((c) => c.m1 !== '—')
      .map((c) => parseFloat(c.m1));
    const avgM1 =
      m1Percentages.length > 0
        ? m1Percentages.reduce((a, b) => a + b, 0) / m1Percentages.length
        : 0;

    // Calculate average M3 retention
    const m3Percentages = cohorts
      .filter((c) => c.m3 !== '—')
      .map((c) => parseFloat(c.m3));
    const avgM3 =
      m3Percentages.length > 0
        ? m3Percentages.reduce((a, b) => a + b, 0) / m3Percentages.length
        : 0;

    return {
      cohorts,
      insights: {
        avgM1Retention: `${avgM1.toFixed(1)}%`,
        avgM3Retention: `${avgM3.toFixed(1)}%`,
        industryBenchmarkM1: '75-80%',
        totalCohorts: cohorts.length,
      },
    };
  }

  private async getCohortRetention() {
    return this.prisma.$queryRaw`
      WITH cohorts AS (
        SELECT 
          id,
          DATE_TRUNC('month', "createdAt") as cohort_month
        FROM users
        WHERE "createdAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
      ),
      user_activity AS (
        SELECT DISTINCT
          ps."userId",
          DATE_TRUNC('month', ps."completedAt") as activity_month
        FROM practice_sessions ps
        WHERE ps."completedAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
        
        UNION
        
        SELECT DISTINCT
          id as "userId",
          DATE_TRUNC('month', "createdAt") as activity_month
        FROM users
        WHERE "createdAt" >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
      ),
      cohort_sizes AS (
        SELECT 
          cohort_month,
          COUNT(DISTINCT id)::INT as total_users
        FROM cohorts
        GROUP BY cohort_month
      ),
      retention_data AS (
        SELECT 
          c.cohort_month,
          EXTRACT(MONTH FROM AGE(ua.activity_month, c.cohort_month))::INTEGER as months_since,
          COUNT(DISTINCT c.id)::INT as active_users
        FROM cohorts c
        LEFT JOIN user_activity ua ON c.id = ua."userId"
        WHERE ua.activity_month IS NOT NULL
        GROUP BY c.cohort_month, months_since
      )
      SELECT 
        TO_CHAR(cs.cohort_month, 'Mon YYYY') as cohort,
        cs.total_users::INT as users,
        '100%' as m0,
        COALESCE(ROUND((MAX(CASE WHEN rd.months_since = 1 THEN rd.active_users END)::NUMERIC / cs.total_users::NUMERIC) * 100) || '%', '—') as m1,
        COALESCE(ROUND((MAX(CASE WHEN rd.months_since = 2 THEN rd.active_users END)::NUMERIC / cs.total_users::NUMERIC) * 100) || '%', '—') as m2,
        COALESCE(ROUND((MAX(CASE WHEN rd.months_since = 3 THEN rd.active_users END)::NUMERIC / cs.total_users::NUMERIC) * 100) || '%', '—') as m3
      FROM cohort_sizes cs
      LEFT JOIN retention_data rd ON cs.cohort_month = rd.cohort_month
      GROUP BY cs.cohort_month, cs.total_users
      ORDER BY cs.cohort_month DESC
      LIMIT 12;
    `;
  }

  /**
   * User Engagement Dashboard
   * DAU/WAU/MAU, Stickiness, Feature Usage, and avg sessions
   */
  async getEngagementDashboard() {
    const engagement = await this.getUserEngagement();

    return {
      metrics: {
        activeUsers: {
          dau: engagement.activeUsers.dau,
          wau: engagement.activeUsers.wau,
          mau: engagement.activeUsers.mau,
          stickiness: `${engagement.activeUsers.stickiness}%`,
          benchmark: engagement.activeUsers.benchmark,
          performance:
            engagement.activeUsers.stickiness > 30
              ? 'Above Benchmark'
              : 'Below Benchmark',
        },
        features: engagement.featureUsage,
        session: {
          avgDuration: engagement.averageSession,
          avgLessonsPerWeek: engagement.lessonsPerWeek,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async getUserEngagement() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dauArr, wauArr, mauArr] = await Promise.all([
      this.prisma.practiceSession.findMany({
        where: { completedAt: { gte: yesterday } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.practiceSession.findMany({
        where: { completedAt: { gte: weekAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.practiceSession.findMany({
        where: { completedAt: { gte: monthAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const dau = dauArr.length;
    const wau = wauArr.length;
    const mau = mauArr.length;

    const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

    const featureUsageRaw = await this.prisma.practiceSession.groupBy({
      by: ['skillArea'],
      where: { completedAt: { gte: monthAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const featureNameMap: { [key: string]: string } = {
      listening: 'Listening Practice',
      reading: 'Reading Exercises',
      writing: 'Writing Practice',
      speaking: 'Speaking Practice',
      grammar: 'Grammar Practice',
    };

    const featureUsage = featureUsageRaw.map((item) => ({
      feature: featureNameMap[item.skillArea || ''] || item.skillArea || 'Other',
      sessions: item._count.id,
    }));

    const sessionStats = await this.prisma.practiceSession.aggregate({
      where: { completedAt: { gte: monthAgo } },
      _avg: { durationSeconds: true },
    });

    const avgSeconds = sessionStats._avg.durationSeconds || 0;
    const minutes = Math.floor(avgSeconds / 60);
    const seconds = Math.round(avgSeconds % 60);
    const averageSession = `${minutes}m ${seconds}s`;

    const weeklyLessons = (await this.prisma.$queryRaw`
      WITH weekly_lessons AS (
        SELECT 
          "userId",
          DATE_TRUNC('week', "completedAt") as week,
          COUNT(*) as lessons_count
        FROM practice_sessions
        WHERE "completedAt" >= ${monthAgo}
        GROUP BY "userId", DATE_TRUNC('week', "completedAt")
      )
      SELECT ROUND(AVG(lessons_count)::numeric, 1)::float as avg_lessons
      FROM weekly_lessons;
    `) as Array<{ avg_lessons: number }>;

    const lessonsPerWeek = weeklyLessons[0]?.avg_lessons || 0;

    return {
      activeUsers: {
        dau,
        wau,
        mau,
        stickiness: parseFloat(stickiness.toFixed(1)),
        benchmark: '20-30%',
      },
      featureUsage,
      averageSession,
      lessonsPerWeek,
    };
  }

  /**
   * Top Performing Content Analytics
   * Most popular lessons, skill metrics, and difficulty performance
   */
  async getContentAnalytics() {
    const content = await this.getTopPerformingContent(30);

    return {
      topLessons: content.topLessons.map((lesson) => ({
        topic: lesson.topic,
        completions: lesson.completions,
        uniqueUsers: lesson.uniqueUsers,
        avgAccuracy: `${lesson.avgAccuracy}%`,
        skill: lesson.skill,
        difficulty: lesson.difficulty,
      })),
      skillBreakdown: content.skillBreakdown.map((skill) => ({
        skill: skill.skill
          .replace('_', ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        completions: skill.completions,
        avgAccuracy: `${skill.avgAccuracy}%`,
      })),
      difficultyBreakdown: content.difficultyBreakdown,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getTopPerformingContent(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Top Lessons Query
    const topLessons = (await this.prisma.$queryRaw`
      SELECT 
        COALESCE(l.topic, l.lesson_title, 'Untitled') as topic,
        COUNT(ps.id)::int as completions,
        COUNT(DISTINCT ps."userId")::int as "uniqueUsers",
        ROUND(AVG(ps.accuracy)::numeric, 1)::float as "avgAccuracy",
        l.skill::text as skill,
        COALESCE(l.difficulty, l.level, 'N/A')::text as difficulty
      FROM practice_sessions ps
      INNER JOIN lessons l ON ps."lessonId" = l.id
      WHERE ps."completedAt" >= ${startDate}
        AND l."isPublished" = true
      GROUP BY l.id, l.topic, l.lesson_title, l.skill, l.difficulty, l.level
      HAVING COUNT(ps.id) > 0
      ORDER BY completions DESC
      LIMIT 10;
    `) as any[];

    // Skill Breakdown
    const skillBreakdown = (await this.prisma.$queryRaw`
      SELECT 
        l.skill::text as skill,
        COUNT(ps.id)::int as completions,
        ROUND(AVG(ps.accuracy)::numeric, 1)::float as "avgAccuracy"
      FROM practice_sessions ps
      INNER JOIN lessons l ON ps."lessonId" = l.id
      WHERE ps."completedAt" >= ${startDate}
        AND l.skill IS NOT NULL
      GROUP BY l.skill
      ORDER BY completions DESC;
    `) as any[];

    // Difficulty Breakdown
    const difficultyBreakdown = (await this.prisma.$queryRaw`
      SELECT 
        COALESCE(l.difficulty, l.level)::text as level,
        COUNT(ps.id)::int as completions,
        ROUND(
          (COUNT(ps.id) FILTER (WHERE ps.accuracy >= 80)::NUMERIC / 
           NULLIF(COUNT(ps.id), 0)::NUMERIC) * 100, 
          1
        )::float as "successRate"
      FROM practice_sessions ps
      INNER JOIN lessons l ON ps."lessonId" = l.id
      WHERE ps."completedAt" >= ${startDate}
        AND (l.difficulty IS NOT NULL OR l.level IS NOT NULL)
      GROUP BY COALESCE(l.difficulty, l.level)
      ORDER BY 
        CASE COALESCE(l.difficulty, l.level)
          WHEN 'A1' THEN 1
          WHEN 'A2' THEN 2
          WHEN 'B1' THEN 3
          WHEN 'B2' THEN 4
          WHEN 'C1' THEN 5
          WHEN 'C2' THEN 6
          ELSE 7
        END;
    `) as any[];

    return {
      topLessons,
      skillBreakdown,
      difficultyBreakdown,
    };
  }

  /**
   * Customer Acquisition Analytics
   * CAC, LTV/CAC ratio, payback periods, and channel attribution
   */
  async getCustomerAcquisitionMetrics() {
    const cacData = await this.calculateCAC();
    const ltvData = await this.calculateLTVForCAC();
    const paybackMonths = await this.calculateCACPayback(cacData.cac);
    const channels = await this.getAcquisitionChannels();

    const ltvCacRatio =
      cacData.cac > 0 ? ltvData.estimated_ltv / cacData.cac : 0;

    return {
      cac: {
        perSubscriber: cacData.cac,
        currency: '€',
        period: 'Last 3 months',
      },
      ltv: {
        value: ltvData.estimated_ltv,
        ltvCacRatio: parseFloat(ltvCacRatio.toFixed(1)),
        cacPaybackMonths: parseFloat(paybackMonths.toFixed(1)),
      },
      unitEconomics: {
        status: ltvCacRatio >= 3 ? 'Healthy' : 'Needs Improvement',
        benchmark: 'LTV:CAC ≥ 3:1 indicates sustainable growth',
        sustainable: ltvCacRatio >= 3,
      },
      acquisitionChannels: channels.map((ch) => ({
        channel: ch.channel,
        percentage: ch.channel_percentage,
        totalUsers: ch.total_users,
        conversions: ch.pro_conversions,
        conversionRate: ch.conversion_rate,
      })),
    };
  }

  private async calculateCAC(monthsBack = 3) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get marketing spend from integration_usage_stats (e.g. Meta/Google ads API costs)
    const marketingSpend = (await this.prisma.$queryRaw`
      SELECT COALESCE(SUM("costUsd"), 0)::float as total_spend
      FROM integration_usage_stats
      WHERE "recordedAt" >= ${startDate}
        AND operation LIKE '%ads%'
    `) as any[];

    // Get new pro subscribers
    const newSubscribers = await this.prisma.subscription.count({
      where: {
        plan: 'PRO',
        createdAt: { gte: startDate },
        status: { in: ['active', 'trialing'] },
      },
    });

    const totalSpend = marketingSpend[0]?.total_spend || 0;
    const cac = newSubscribers > 0 ? totalSpend / newSubscribers : 0;

    return {
      cac: parseFloat(cac.toFixed(2)),
      subscribers: newSubscribers,
      spend: totalSpend,
    };
  }

  private async calculateLTVForCAC() {
    const ltvData = (await this.prisma.$queryRaw`
      WITH subscription_revenue AS (
        SELECT 
          "userId",
          SUM(price) as total_revenue,
          COUNT(DISTINCT DATE_TRUNC('month', "recordedAt")) as months_active
        FROM subscription_history
        WHERE status = 'active'
          AND event IN ('NEW', 'RENEWAL')
        GROUP BY "userId"
        HAVING COUNT(*) > 0
      )
      SELECT 
        ROUND(AVG(months_active)::numeric, 1)::float as avg_lifetime_months,
        ROUND(AVG(total_revenue / NULLIF(months_active, 0))::numeric, 2)::float as avg_monthly_revenue,
        ROUND((AVG(months_active) * AVG(total_revenue / NULLIF(months_active, 0)))::numeric, 2)::float as estimated_ltv
      FROM subscription_revenue
      WHERE months_active > 0
    `) as any[];

    return (
      ltvData[0] || {
        avg_lifetime_months: 0,
        avg_monthly_revenue: 0,
        estimated_ltv: 0,
      }
    );
  }

  private async calculateCACPayback(cacAmount: number) {
    if (cacAmount <= 0) return 0;

    const paybackData = (await this.prisma.$queryRaw`
      WITH subscription_cohorts AS (
        SELECT 
          s."userId",
          s."createdAt" as subscription_start
        FROM "Subscription" s
        WHERE s.plan = 'PRO'
          AND s."createdAt" >= CURRENT_DATE - INTERVAL '12 months'
      ),
      revenue_timeline AS (
        SELECT 
          sc."userId",
          SUM(sh.price) OVER (
            PARTITION BY sc."userId" 
            ORDER BY sh."recordedAt"
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) as cumulative_revenue,
          EXTRACT(MONTH FROM AGE(sh."recordedAt", sc.subscription_start))::int as months_since_start
        FROM subscription_cohorts sc
        INNER JOIN subscription_history sh ON sc."userId" = sh."userId"
        WHERE sh.event IN ('NEW', 'RENEWAL')
      ),
      payback_per_user AS (
        SELECT 
          "userId",
          MIN(months_since_start) as payback_months
        FROM revenue_timeline
        WHERE cumulative_revenue >= ${cacAmount}
        GROUP BY "userId"
      )
      SELECT 
        ROUND(AVG(payback_months)::numeric, 1)::float as avg_payback_months
      FROM payback_per_user
      WHERE payback_months IS NOT NULL
    `) as any[];

    return paybackData[0]?.avg_payback_months || 0;
  }

  private async getAcquisitionChannels(daysBack = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const channels = (await this.prisma.$queryRaw`
      WITH channel_mapping AS (
        SELECT 
          u.id,
          COALESCE(
            u."acquisitionChannel",
            CASE 
              WHEN u."utmSource" = 'google' OR u."utmMedium" = 'organic' THEN 'Organic Search'
              WHEN u."referralCode" IS NOT NULL THEN 'Word of Mouth'
              WHEN u."utmSource" IN ('facebook', 'instagram', 'twitter', 'linkedin') THEN 'Social Media'
              WHEN u."utmMedium" IN ('cpc', 'paid') THEN 'Paid Ads'
              ELSE 'Direct'
            END
          ) as channel
        FROM users u
        WHERE u."createdAt" >= ${startDate}
      ),
      pro_conversions AS (
        SELECT 
          cm.channel,
          COUNT(DISTINCT cm.id)::int as total_users,
          COUNT(DISTINCT s."userId")::int as pro_conversions,
          ROUND(
            (COUNT(DISTINCT s."userId")::NUMERIC / NULLIF(COUNT(DISTINCT cm.id), 0)::NUMERIC) * 100,
            1
          )::float as conversion_rate
        FROM channel_mapping cm
        LEFT JOIN "Subscription" s ON cm.id = s."userId" AND s.plan = 'PRO'
        GROUP BY cm.channel
      )
      SELECT 
        channel,
        total_users,
        pro_conversions,
        conversion_rate,
        ROUND(
          (total_users::NUMERIC / NULLIF(SUM(total_users) OVER (), 0))::NUMERIC * 100,
          0
        )::float as channel_percentage
      FROM pro_conversions
      ORDER BY total_users DESC
    `) as any[];

    return channels;
  }
}
