// src/common/service/practice-session.service.ts
import { Injectable } from '@nestjs/common';
import { SkillArea } from '@prisma/client';
import { PrismaService } from 'src/common/service/prisma/prisma.service';

@Injectable()
export class PracticeSessionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Main method — called from lesson complete OR flashcard session finish
   */
  async createSession(data: {
    userId: string;
    skillArea: SkillArea;
    lessonId?: number;        // null for flashcards
    accuracy: number;
    durationSeconds: number;
    xpEarned: number;
  }) {
    const {
      userId,
      skillArea,
      lessonId,
      accuracy,
      durationSeconds,
      xpEarned,
    } = data;

    // 1. Create PracticeSession record
    await this.prisma.practiceSession.create({
      data: {
        userId,
        lessonId: lessonId || null,
        skillArea,
        accuracy,
        durationSeconds,
        xpEarned,
      },
    });

    // 2. Get current user data for streak calculation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastPracticeDate: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Normalize today and last practice date to midnight for accurate day comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newCurrentStreak = 1;
    let newLongestStreak = user.longestStreak || 0;

    if (user.lastPracticeDate) {
      const lastDate = new Date(user.lastPracticeDate);
      lastDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        // Practiced yesterday → continue streak
        newCurrentStreak = (user.currentStreak || 0) + 1;
      } else if (diffDays > 1) {
        // Missed one or more days → reset streak
        newCurrentStreak = 1;
      } else {
        // Same day → keep current streak (don't increase)
        newCurrentStreak = user.currentStreak || 1;
      }
    }

    // Update longest streak if current one is higher
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }

    // 3. Update User stats with correct streak
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: xpEarned },
        totalMinutesStudied: { increment: Math.round(durationSeconds / 60) },
        lessonsCompleted: lessonId ? { increment: 1 } : undefined,
        lastPracticeDate: new Date(),
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
      },
    });

    // 4. Queue CEFR confidence update for this skill
    await this.prisma.confidenceUpdateQueue.upsert({
      where: {
        userId_skillArea: {
          userId,
          skillArea,
        },
      },
      update: {
        queuedAt: new Date(),
        status: 'pending',
      },
      create: {
        userId,
        skillArea,
        status: 'pending',
      },
    });
  }

  /**
   * Helper: Get total minutes this week for dashboard
   */
  async getWeeklyMinutes(userId: string): Promise<number> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await this.prisma.practiceSession.aggregate({
      where: {
        userId,
        completedAt: { gte: oneWeekAgo },
      },
      _sum: { durationSeconds: true },
    });

    return Math.round((result._sum.durationSeconds || 0) / 60);
  }

  /**
   * Helper: Get average accuracy this week
   */
  async getWeeklyAccuracy(userId: string): Promise<number> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const sessions = await this.prisma.practiceSession.findMany({
      where: {
        userId,
        completedAt: { gte: oneWeekAgo },
      },
      select: { accuracy: true },
    });

    if (sessions.length === 0) return 0;

    const total = sessions.reduce((sum, s) => sum + s.accuracy, 0);
    return Math.round(total / sessions.length);
  }





// ADD THESE TWO
  async getTodayMinutes(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.prisma.practiceSession.aggregate({
      where: {
        userId,
        completedAt: { gte: today, lt: tomorrow },
      },
      _sum: { durationSeconds: true },
    });

    return Math.round((result._sum.durationSeconds || 0) / 60);
  }

  async getWeeklyLessons(userId: string): Promise<number> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    return await this.prisma.practiceSession.count({
      where: {
        userId,
        completedAt: { gte: oneWeekAgo },
        lessonId: { not: null },
      },
    });
  }







}