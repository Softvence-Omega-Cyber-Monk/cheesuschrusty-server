import { Module } from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlansController } from './subscription-plan.controller';

@Module({
  controllers: [SubscriptionPlansController],
  providers: [SubscriptionPlanService],
   exports: [SubscriptionPlanService],
})
export class SubscriptionPlanModule {}
