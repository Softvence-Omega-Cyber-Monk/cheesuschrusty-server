import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module';

import { IntegrationManagementModule } from '../integration-management/integration-management.module';
import { LemonSqueezyClient } from './lemon-squeezy.client';

@Module({
  imports: [SubscriptionPlanModule, IntegrationManagementModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, LemonSqueezyClient],
  exports: [SubscriptionService, LemonSqueezyClient],
})
export class SubscriptionModule {}
