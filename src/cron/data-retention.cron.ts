import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/common/service/prisma/prisma.service';


@Injectable()
export class DataRetentionCron {
  private readonly logger = new Logger(DataRetentionCron.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async deleteInactiveUsers() {
    this.logger.log('Running data retention cleanup...');

    const settings = await this.prisma.securitySettings.findUnique({ where: { id: 1 } });

    if (!settings?.dataRetentionPolicy) {
      return this.logger.log('Data retention disabled. Skipping.');
    }

    const retentionDays = settings.dataRetentionDays;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const deleted = await this.prisma.user.deleteMany({
      where: {
        lastLoginAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Deleted ${deleted.count} inactive users.`);
  }
}
