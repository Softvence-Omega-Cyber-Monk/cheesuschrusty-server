// src/common/service/cefr-confidence.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SkillArea, ConfidenceLevel, Difficulty } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CefrConfidenceService {
  private readonly logger = new Logger(CefrConfidenceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main method: Calculate CEFR confidence for one user + one skill
   * Called from queue or manually
   */
async updateConfidence(userId: string, skillArea: SkillArea) {
  const sessions = await this.prisma.practiceSession.findMany({
    where: { userId, skillArea },
    orderBy: { completedAt: 'desc' },
    take: 50, // Use more data for smoother progression
  });

  if (sessions.length < 3) {
    // Very little data → show starting point
    await this.prisma.cefrConfidenceCache.upsert({
      where: { userId_skillArea: { userId, skillArea } },
      update: { sessionsAnalyzed: sessions.length },
      create: {
        userId,
        skillArea,
        cefrLevel: Difficulty.A2,
        confidenceLower: 20,
        confidenceUpper: 45,
        confidenceLevel: ConfidenceLevel.LOW,
        sessionsAnalyzed: sessions.length,
      },
    });
    return;
  }

  const accuracies = sessions.map(s => s.accuracy);
  const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((a, b) => a + Math.pow(b - avgAccuracy, 2), 0) / accuracies.length;
  const stdDev = Math.sqrt(variance);

  // More granular CEFR levels
  let cefrLevel: Difficulty = Difficulty.B1;
  if (avgAccuracy < 45) cefrLevel = Difficulty.A1;
  else if (avgAccuracy < 60) cefrLevel = Difficulty.A2;
  else if (avgAccuracy < 75) cefrLevel = Difficulty.B1;
  else if (avgAccuracy < 90) cefrLevel = Difficulty.B2;
  else cefrLevel = Difficulty.C1;

  // Dynamic confidence range — tighter with consistency & more data
  let rangeWidth = Math.max(8, stdDev * 2); // Minimum 8% spread
  if (sessions.length > 20) rangeWidth *= 0.8; // More data = tighter range
  if (stdDev < 10) rangeWidth *= 0.7; // Very consistent = very tight

  let lower = Math.max(5, avgAccuracy - rangeWidth / 2);
  let upper = Math.min(99, avgAccuracy + rangeWidth / 2);

  // Confidence level based on data quality
  let confidenceLevel: ConfidenceLevel = ConfidenceLevel.LOW;
  if (sessions.length >= 10 && stdDev <= 15) confidenceLevel = ConfidenceLevel.MEDIUM;
  if (sessions.length >= 25 && stdDev <= 10) confidenceLevel = ConfidenceLevel.HIGH;

  // Trend detection — last 10 vs previous
  const recentAvg = accuracies.slice(0, Math.min(10, accuracies.length)).reduce((a, b) => a + b, 0) /
    Math.min(10, accuracies.length);
  const olderAvg = accuracies.slice(Math.min(10, accuracies.length)).reduce((a, b) => a + b, 0) /
    (accuracies.length - Math.min(10, accuracies.length)) || recentAvg;

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentAvg > olderAvg + 4) trend = 'improving';
  else if (recentAvg < olderAvg - 4) trend = 'declining';

  // Bonus: Estimated weeks to solid B1
  let weeksToB1: number | null = null;
  if (cefrLevel === Difficulty.A2 || cefrLevel === Difficulty.A1) {
    const target = 70; // 70% = solid B1
    const gap = target - avgAccuracy;
    const weeklyGain = trend === 'improving' ? 5 : trend === 'stable' ? 3 : 1;
    weeksToB1 = Math.max(1, Math.ceil(gap / weeklyGain));
  }

  await this.prisma.cefrConfidenceCache.upsert({
    where: { userId_skillArea: { userId, skillArea } },
    update: {
      cefrLevel,
      confidenceLower: Math.round(lower),
      confidenceUpper: Math.round(upper),
      confidenceLevel,
      performanceTrend: trend,
      sessionsAnalyzed: sessions.length,
      lastCalculatedAt: new Date(),
      // Add custom field if you want weeksToB1 (need schema change)
    },
    create: {
      userId,
      skillArea,
      cefrLevel,
      confidenceLower: Math.round(lower),
      confidenceUpper: Math.round(upper),
      confidenceLevel,
      performanceTrend: trend,
      sessionsAnalyzed: sessions.length,
    },
  });

  this.logger.log(
    `CEFR ${skillArea} for user ${userId}: ${cefrLevel} (${Math.round(lower)}–${Math.round(upper)}%) ` +
    `| ${confidenceLevel} | Trend: ${trend} | Sessions: ${sessions.length}`
  );
}

  /**
   * Cron job: Process queue every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processQueue() {

   const count = await this.prisma.confidenceUpdateQueue.count({
    where: { status: 'pending' },
  });

  if (count === 0) {
    this.logger.verbose('No pending CEFR updates — skipping');
    return;
  }




    this.logger.log('Starting CEFR confidence queue processing...');

    const queued = await this.prisma.confidenceUpdateQueue.findMany({
      where: { status: 'pending' },
      take: 50, // process in batches
    });

    for (const item of queued) {
      try {
        await this.updateConfidence(item.userId, item.skillArea);
        await this.prisma.confidenceUpdateQueue.update({
          where: { id: item.id },
          data: { status: 'processed' },
        });
      } catch (error) {
        this.logger.error(`Failed to update confidence for ${item.userId} - ${item.skillArea}`, error);
        // Optional: mark as failed or retry later
      }
    }

    this.logger.log(`Processed ${queued.length} confidence updates`);
  }

  /**
   * Optional: Force update for one user (for testing)
   */
  async forceUpdateForUser(userId: string) {
    const skills: SkillArea[] = ['reading', 'listening', 'writing', 'speaking'];
    for (const skill of skills) {
      await this.updateConfidence(userId, skill);
    }
  }





/**
 * Get formatted CEFR progress for all 4 skills (for dashboard display)
 */
async getUserProgress(userId: string) {
  const cache = await this.prisma.cefrConfidenceCache.findMany({
    where: { userId },
  });

  const allSkills: SkillArea[] = ['reading', 'listening', 'writing', 'speaking'];

  const skills = allSkills.map(skill => {
    const found = cache.find(c => c.skillArea === skill);

    // If no data or very little data → show starting point
    if (!found || found.sessionsAnalyzed < 3) {
      return {
        skillArea: skill,
        cefrLevel: 'A2',
        confidenceLower: 20,
        confidenceUpper: 45,
        confidenceLevel: 'LOW' as ConfidenceLevel,
        performanceTrend: 'stable',
        sessionsAnalyzed: found?.sessionsAnalyzed || 0,
        message: 'Start practicing to see your progress!',
      };
    }

    return {
      skillArea: found.skillArea,
      cefrLevel: found.cefrLevel,
      confidenceLower: found.confidenceLower,
      confidenceUpper: found.confidenceUpper,
      confidenceLevel: found.confidenceLevel,
      performanceTrend: found.performanceTrend,
      sessionsAnalyzed: found.sessionsAnalyzed,
      message: this.getMotivationalMessage(found),
    };
  });

  return { skills };
}

private getMotivationalMessage(data: any): string {
  if (data.confidenceLevel === ConfidenceLevel.HIGH) {
    return 'Excellent consistency! Keep it up!';
  }
  if (data.performanceTrend === 'improving') {
    return 'Amazing improvement! You\'re getting stronger!';
  }
  return 'Daily practice will get you to B1 soon InshaAllah!';
}












}