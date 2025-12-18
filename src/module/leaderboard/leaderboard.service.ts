// src/module/leaderboard/leaderboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { SkillArea } from '@prisma/client';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(userId: string, period: 'daily' | 'weekly' | 'monthly' | 'alltime' = 'alltime') {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        xp: true,
        currentStreak: true,
        currentLevel: true,
      },
    });

    if (!currentUser) throw new Error('User not found');

    let leaderboardUsers: any[] = [];
    let userRank = 1;
    let periodPoints = 0;

    if (period === 'alltime') {
      leaderboardUsers = await this.prisma.user.findMany({
        orderBy: { xp: 'desc' },
        select: {
          id: true,
          name: true,
          avatar: true,
          xp: true,
          currentStreak: true,
          currentLevel: true,
        },
      });

      userRank = leaderboardUsers.findIndex(u => u.id === userId) + 1;
      periodPoints = currentUser.xp;
    } else {
      const startDate = this.getPeriodStartDate(period);

      const periodXp = await this.prisma.practiceSession.groupBy({
        by: ['userId'],
        where: { completedAt: { gte: startDate } },
        _sum: { xpEarned: true },
      });

      const userIds = periodXp.map(p => p.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          avatar: true,
          currentStreak: true,
          currentLevel: true,
          xp: true,
        },
      });

      leaderboardUsers = periodXp
        .map(p => {
          const user = users.find(u => u.id === p.userId);
          return user ? { ...user, periodXp: p._sum.xpEarned || 0 } : null;
        })
        .filter(Boolean)
        .sort((a, b) => (b as any).periodXp - (a as any).periodXp)
        .slice(0, 50);

      const userEntry = leaderboardUsers.find(u => u.id === userId);
      userRank = leaderboardUsers.findIndex(u => u.id === userId) + 1;
      periodPoints = userEntry?.periodXp || 0;
    }

    const top10 = leaderboardUsers.slice(0, 10);

    const yourSkill = await this.getUserSkillPoints(userId);
    const quickStats = await this.getQuickStats(userId, period);

    // FIXED: Real estimated level
    const estimatedLevel = await this.getEstimatedOverallLevel(userId);

    // FIXED: Calculate estimated level for each top user
    const top10WithEstimated = await Promise.all(
      top10.map(async (u, index) => {
        const estLevel = await this.getEstimatedOverallLevel(u.id);
        return {
          rank: index + 1,
          name: u.name,
          avatar: u.avatar,
          points: period === 'alltime' ? u.xp : u.periodXp,
          streak: u.currentStreak,
          declaredLevel: u.currentLevel,
          estimatedLevel: estLevel,
        };
      })
    );

    return {
      yourPosition: {
        rank: userRank,
        name: currentUser.name,
        avatar: currentUser.avatar,
        totalXp: currentUser.xp,
        periodPoints,
        dailyStreak: currentUser.currentStreak,
        declaredLevel: currentUser.currentLevel,
        estimatedLevel, // ← Now real!
      },
      top10Learners: top10WithEstimated, // ← Now real for all!
      yourSkill,
      quickStats,
    };
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        now.setHours(0, 0, 0, 0);
        return now;
      case 'weekly':
        const day = now.getDay();
        now.setDate(now.getDate() - day);
        now.setHours(0, 0, 0, 0);
        return now;
      case 'monthly':
        now.setDate(1);
        now.setHours(0, 0, 0, 0);
        return now;
      default:
        return new Date(0);
    }
  }

  private async getUserSkillPoints(userId: string) {
    const cache = await this.prisma.cefrConfidenceCache.findMany({
      where: { userId },
    });

    const allSkills: SkillArea[] = ['reading', 'listening', 'writing', 'speaking'];

    return allSkills.map(skill => {
      const found = cache.find(c => c.skillArea === skill);

      if (!found || found.sessionsAnalyzed < 3) {
        return { skillArea: skill, points: 20 };
      }

      const avg = Math.round((found.confidenceLower + found.confidenceUpper) / 2);
      return { skillArea: skill, points: avg };
    });
  }

  private async getQuickStats(userId: string, period: string) {
    const startDate = period === 'alltime' ? new Date(0) : this.getPeriodStartDate(period);

    const periodSessions = await this.prisma.practiceSession.findMany({
      where: { userId, completedAt: { gte: startDate } },
    });

    const periodXp = periodSessions.reduce((sum, s) => sum + s.xpEarned, 0);
    const totalBadges = await this.prisma.userBadge.count({ where: { userId } });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });

    return {
      periodPoints: periodXp,
      totalBadges,
      currentLevel: user?.currentLevel || 'A2',
    };
  }



  
private async getEstimatedOverallLevel(userId: string): Promise<string> {
  const cache = await this.prisma.cefrConfidenceCache.findMany({
    where: { userId },
  });

  const allSkills: SkillArea[] = ['reading', 'listening', 'writing', 'speaking'];

  const levelValues: Record<string, number> = {
    'A1': 1,
    'A2': 2,
    'B1': 3,
    'B2': 4,
    'C1': 5,
  };

  let total = 0;

  allSkills.forEach(skill => {
    const found = cache.find(c => c.skillArea === skill);
    const level = found ? found.cefrLevel : 'A1'; // ← Default to A1 if no data
    total += levelValues[level] || 1;
  });

  const average = total / allSkills.length;
  const rounded = Math.round(average);

  const reverseMap = ['A1', 'A2', 'B1', 'B2', 'C1'];
  return reverseMap[rounded - 1] || 'A1';
}

}