import { Module } from '@nestjs/common';
import { FaqManagementController } from './faq-management.controller';
import { FaqPublicController } from './faq-public.controller';
import { FaqManagementService } from './faq-management.service';

@Module({
  controllers: [FaqManagementController, FaqPublicController],
  providers: [FaqManagementService],
})
export class FaqManagementModule {}
