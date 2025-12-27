// src/module/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

// Import the shared services
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { PracticeSessionService } from '../practice-session/practice-session.service';
import { CefrConfidenceService } from 'src/common/service/cefr/cefr-confidence.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    PrismaService,
    PracticeSessionService,         
    CefrConfidenceService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}