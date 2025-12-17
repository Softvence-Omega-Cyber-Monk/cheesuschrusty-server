// src/module/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { PracticeSessionService } from '../practice-session/practice-session.service';
import { CefrConfidenceService } from 'src/common/service/cefr/cefr-confidence.service';


@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private practiceSessionService: PracticeSessionService,
    private cefrConfidenceService: CefrConfidenceService,
  ) {}

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
      duration: `${Math.round(s.durationSeconds / 60)} min`,
      accuracy: `${s.accuracy}%`,
      date: new Date(s.completedAt).toLocaleDateString(),
    }));
  }
}