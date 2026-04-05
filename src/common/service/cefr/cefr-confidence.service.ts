import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfidenceLevel, Difficulty } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CefrConfidenceService {
  private readonly logger = new Logger(CefrConfidenceService.name);

  constructor(
    private prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Main method: Calculate CEFR confidence for one user + one skill
   * Called from queue or manually
   */
  async updateConfidence(userId: string, skillArea: string) {
    const sessions = await this.prisma.practiceSession.findMany({
      where: { userId, skillArea: skillArea as any },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });

    if (sessions.length < 3) {
      // Very little data → show true beginner level (A1)
      await this.prisma.cefrConfidenceCache.upsert({
        where: {
          userId_skillArea: { userId, skillArea: skillArea as any },
        },
        update: { sessionsAnalyzed: sessions.length },
        create: {
          userId,
          skillArea: skillArea as any,
          cefrLevel: Difficulty.A1,
          confidenceLower: 15,
          confidenceUpper: 40,
          confidenceLevel: ConfidenceLevel.LOW,
          sessionsAnalyzed: sessions.length,
        },
      });
      return;
    }

    const accuracies = sessions.map((s) => s.accuracy);
    const avgAccuracy =
      accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const variance =
      accuracies.reduce((a, b) => a + Math.pow(b - avgAccuracy, 2), 0) /
      accuracies.length;
    const stdDev = Math.sqrt(variance);

    let cefrLevel: Difficulty = Difficulty.B1;
    if (avgAccuracy < 45) cefrLevel = Difficulty.A1;
    else if (avgAccuracy < 60) cefrLevel = Difficulty.A2;
    else if (avgAccuracy < 75) cefrLevel = Difficulty.B1;
    else if (avgAccuracy < 90) cefrLevel = Difficulty.B2;
    else cefrLevel = Difficulty.C1;

    let rangeWidth = Math.max(8, stdDev * 2);
    if (sessions.length > 20) rangeWidth *= 0.8;
    if (stdDev < 10) rangeWidth *= 0.7;

    const lower = Math.max(5, avgAccuracy - rangeWidth / 2);
    const upper = Math.min(99, avgAccuracy + rangeWidth / 2);

    let confidenceLevel: ConfidenceLevel = ConfidenceLevel.LOW;
    if (sessions.length >= 10 && stdDev <= 15)
      confidenceLevel = ConfidenceLevel.MEDIUM;
    if (sessions.length >= 25 && stdDev <= 10)
      confidenceLevel = ConfidenceLevel.HIGH;

    // Trend detection
    const recentAvg =
      accuracies
        .slice(0, Math.min(10, accuracies.length))
        .reduce((a, b) => a + b, 0) / Math.min(10, accuracies.length);
    const olderAvg =
      accuracies
        .slice(Math.min(10, accuracies.length))
        .reduce((a, b) => a + b, 0) /
        (accuracies.length - Math.min(10, accuracies.length)) || recentAvg;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAvg > olderAvg + 4) trend = 'improving';
    else if (recentAvg < olderAvg - 4) trend = 'declining';

    await this.prisma.cefrConfidenceCache.upsert({
      where: {
        userId_skillArea: { userId, skillArea: skillArea as any },
      },
      update: {
        cefrLevel,
        confidenceLower: Math.round(lower),
        confidenceUpper: Math.round(upper),
        confidenceLevel,
        performanceTrend: trend as any,
        sessionsAnalyzed: sessions.length,
        lastCalculatedAt: new Date(),
      },
      create: {
        userId,
        skillArea: skillArea as any,
        cefrLevel,
        confidenceLower: Math.round(lower),
        confidenceUpper: Math.round(upper),
        confidenceLevel,
        performanceTrend: trend as any,
        sessionsAnalyzed: sessions.length,
      },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processQueue() {
    const queued = await this.prisma.confidenceUpdateQueue.findMany({
      where: { status: 'pending' },
      take: 50,
    });

    for (const item of queued) {
      try {
        await this.updateConfidence(item.userId, item.skillArea);
        await this.prisma.confidenceUpdateQueue.update({
          where: { id: item.id },
          data: { status: 'processed' },
        });
      } catch (error) {
        this.logger.error(
          `Failed to update confidence for ${item.userId} - ${item.skillArea}`,
          error,
        );
      }
    }
  }

  async fetchExternalSkills(): Promise<string[]> {
    const aiApiUrl = this.configService.get('AI_API_URL');
    if (!aiApiUrl) return [];

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${aiApiUrl}/ai/admin/master-prompt-structure`),
      );
      const externalData = response.data;
      const skillsSet = new Set<string>();

      if (externalData?.data && Array.isArray(externalData.data)) {
        externalData.data.forEach((level: any) => {
          if (level.practises && Array.isArray(level.practises)) {
            level.practises.forEach((practice: any) => {
              if (practice.skill) {
                skillsSet.add(practice.skill.toLowerCase());
              }
            });
          }
        });
      }
      return Array.from(skillsSet);
    } catch (error) {
      this.logger.error(`Failed to fetch external skills: ${error.message}`);
      return [];
    }
  }

  async getUserProgress(userId: string) {
    const externalSkills = await this.fetchExternalSkills();
    const cache = await this.prisma.cefrConfidenceCache.findMany({
      where: { userId },
    });

    const coreSkills = ['reading', 'listening', 'writing', 'speaking', 'grammar'];
    const dbSkills = cache.map((c) => c.skillArea);
    const allSkills = Array.from(
      new Set([...coreSkills, ...dbSkills, ...externalSkills]),
    );

    const skills = allSkills.map((skill) => {
      const cached = cache.find((c) => c.skillArea === skill);

      if (cached) {
        return {
          skillArea: skill,
          cefrLevel: cached.cefrLevel,
          confidenceLevel: cached.confidenceLevel,
          performanceTrend: cached.performanceTrend || 'stable',
          lastCalculatedAt: cached.lastCalculatedAt,
          confidenceRange: {
            lower: cached.confidenceLower,
            upper: cached.confidenceUpper,
          },
        };
      }

      return {
        skillArea: skill,
        cefrLevel: 'A1',
        confidenceLevel: 'LOW',
        performanceTrend: 'stable',
        lastCalculatedAt: new Date(),
        confidenceRange: {
          lower: 5,
          upper: 15,
        },
      };
    });

    return {
      userId,
      skills,
    };
  }
}
