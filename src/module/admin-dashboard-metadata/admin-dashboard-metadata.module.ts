import { Module } from '@nestjs/common';
import { AdminDashboardMetadataService } from './admin-dashboard-metadata.service';
import { AdminDashboardMetadataController } from './admin-dashboard-metadata.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports:[SubscriptionModule],
  controllers: [AdminDashboardMetadataController],
  providers: [AdminDashboardMetadataService],
})
export class AdminDashboardMetadataModule {}
