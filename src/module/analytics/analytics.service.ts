// src/module/analytics/analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { PracticeSessionService } from '../practice-session/practice-session.service';
import { CefrConfidenceService } from 'src/common/service/cefr/cefr-confidence.service';
import { BadgeType, LessonType, SkillArea } from '@prisma/client';
import { MailService } from '../mail/mail.service';


@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(
    private prisma: PrismaService,
    private practiceSessionService: PracticeSessionService,
    private cefrConfidenceService: CefrConfidenceService,
    private mailService: MailService,
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

  const isPro = user.subscriptions.length > 0 && 
    user.subscriptions[0].planAlias?.includes('PRO');

  // This week minutes (as requested — not lifetime)
  const thisWeekMinutes = await this.practiceSessionService.getWeeklyMinutes(userId);

  // Total available lessons (dynamic from DB)
  const totalAvailableLessons = await this.prisma.lesson.count({
    where: { isPublished: true },
  });

  // Lessons completed (lifetime)
  const lessonsCompleted = user.lessonsCompleted;
  const lessonsProgress = totalAvailableLessons > 0 
    ? Math.round((lessonsCompleted / totalAvailableLessons) * 100) 
    : 0;

  // Weekly accuracy
  const weeklyAccuracy = await this.practiceSessionService.getWeeklyAccuracy(userId) || 0;

  // Words learned (total)
  const wordsLearned = user.wordsLearned;

  // Current streak
  const currentStreak = user.currentStreak;

  // This week lessons
  const thisWeekLessons = await this.practiceSessionService.getWeeklyLessons(userId);

  // Recent achievements
  const recentAchievements = await this.getRecentAchievements(userId);

  // Practice Areas — real completed lessons per skill
  const practiceAreas = await Promise.all(
    ['reading', 'listening', 'writing', 'speaking'].map(async (skill) => {
      const completed = await this.prisma.practiceSession.count({
        where: {
          userId,
          skillArea: skill as SkillArea,
          lessonId: { not: null }, // only real lessons
        },
      });

      const total = await this.prisma.lesson.count({
        where: {
          isPublished: true,
          type: skill.toUpperCase() as LessonType,
        },
      });

      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        skillArea: skill,
        lessonsCompleted: completed,
        totalLessons: total,
        progress,
      };
    })
  );

  return {
    isPro,
    welcomeMessage: `Welcome Back, ${user.name || 'Learner'}! 👋`,
    weeklyMinutes: thisWeekMinutes, // last week only
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
    practiceAreas, // 4 skills with real progress
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
  const minutesToday = await this.practiceSessionService.getTodayMinutes(userId);
  const dailyProgress = Math.min(100, Math.round((minutesToday / dailyGoal) * 100));

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

  const todayAccuracy = todaySessions.length > 0
    ? Math.round(todaySessions.reduce((sum, s) => sum + s.accuracy, 0) / todaySessions.length)
    : 0;

  // Practice Areas — lessons completed per skill
  const practiceAreas = await Promise.all(
    ['reading', 'listening', 'writing', 'speaking'].map(async (skill) => {
      const completed = await this.prisma.practiceSession.count({
        where: {
          userId,
          skillArea: skill as SkillArea,
          lessonId: { not: null },
        },
      });

      const total = await this.prisma.lesson.count({
        where: {
          isPublished: true,
          type: skill.toUpperCase() as LessonType,
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
    })
  );

  return {
    dailyGoalProgress: {
      minutesToday,
      dailyGoal,
      progress: dailyProgress,
      message: minutesToday >= dailyGoal
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
    const weeklyMinutes = await this.practiceSessionService.getWeeklyMinutes(userId);
    const weeklyAccuracy = await this.practiceSessionService.getWeeklyAccuracy(userId);

    // 3. CEFR progress
    const cefrProgress = await this.cefrConfidenceService.getUserProgress(userId);

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
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ← ADD THIS TYPE DEFINITION
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
      daySessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
    );

    const accuracy = daySessions.length > 0
      ? Math.round(
          daySessions.reduce((sum, s) => sum + s.accuracy, 0) / daySessions.length
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

    return earnedBadges.map(ub => ({
      title: ub.badge.title,
      icon: ub.badge.icon,
      date: this.formatRelativeDate(ub.earnedAt),
    }));
  }

  private formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
  }



  /**
   * Check and award badges based on user performance
   * Call this after every practice session completion
   */
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
    const alreadyHas = user.earnedBadges.some(ub => ub.badgeId === badge.id);
    if (alreadyHas) continue;

    let shouldAward = false;

    switch (badge.type) {
      case BadgeType.STREAK:
        if (user.currentStreak >= (badge.threshold || 0)) shouldAward = true;
        break;

      case BadgeType.LESSONS:
        if (user.lessonsCompleted >= (badge.threshold || 0)) shouldAward = true;
        break;

      case BadgeType.TIME:
        if (user.totalMinutesStudied >= (badge.threshold || 0)) shouldAward = true;
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

        const avgAccuracy = recentSessions.length > 0
          ? recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length
          : 0;

        if (avgAccuracy >= (badge.threshold || 0)) shouldAward = true;
        break;

      case BadgeType.SKILL_MASTERY:
        if (!badge.skillArea) break;
        const skillConfidence = user.cefrConfidence.find(c => c.skillArea === badge.skillArea);
        if (skillConfidence && ['B1', 'B2', 'C1', 'C2'].includes(skillConfidence.cefrLevel)) {
          shouldAward = true;
        }
        break;

      case BadgeType.CITIZENSHIP_READY:
        const highConfidenceCount = user.cefrConfidence.filter(c => c.confidenceLevel === 'HIGH').length;
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
          { title: badge.title, icon: badge.icon, description: badge.description }
        );
        this.logger.log(`Achievement email sent: ${badge.title} to ${user.email}`);
      } catch (error) {
        this.logger.error(`Failed to send achievement email for ${badge.title} to ${user.email}`, error);
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
          select: { title: true, type: true },
        },
      },
    });

    return sessions.map(s => ({
      title: s.lesson ? `${s.lesson.type} - ${s.lesson.title}` : 'Flashcard Practice',
      duration: `${Math.floor(s.durationSeconds / 60)} min`,
      accuracy: `${Math.floor(s.accuracy)}%`,
      date: new Date(s.completedAt).toLocaleDateString(),
    }));
  }
}