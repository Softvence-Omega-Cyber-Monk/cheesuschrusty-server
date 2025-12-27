// src/cron/streak-reminder.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { MailService } from 'src/module/mail/mail.service';


@Injectable()
export class StreakReminderCron {
  private readonly logger = new Logger(StreakReminderCron.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8PM) // 8 PM every day — adjust as needed
  async handleStreakReminders() {
    this.logger.log('Starting daily streak reminder job...');

    // Get global toggle
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings?.learningRemindersEnabled) {
      this.logger.log('Streak reminders disabled globally — skipping');
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Find users who:
    // - Practiced yesterday (had streak)
    // - Did NOT practice today
    // - Have streakRemindersEnabled = true
    const atRiskUsers = await this.prisma.user.findMany({
      where: {
        streakRemindersEnabled: true,
        currentStreak: { gt: 0 },
        lastPracticeDate: {
          gte: yesterdayStart,
          lt: todayStart,
        },
        NOT: {
          practiceSessions: {
            some: {
              completedAt: { gte: todayStart, lte: todayEnd },
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        currentStreak: true,
      },
    });

    this.logger.log(`Found ${atRiskUsers.length} users at risk of breaking streak`);

    for (const user of atRiskUsers) {
      try {
        await this.mailService.sendStreakReminderEmail(
          { email: user.email, name: user.name },
          user.currentStreak
        );
        this.logger.log(`Streak reminder sent to ${user.email}`);
      } catch (error) {
        this.logger.error(`Failed to send reminder to ${user.email}`, error);
      }
    }

    this.logger.log('Streak reminder job completed');
  }
}