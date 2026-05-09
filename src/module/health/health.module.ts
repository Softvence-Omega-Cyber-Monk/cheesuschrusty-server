import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health-indicator';
import { ExternalServicesHealthIndicator } from './external-services.health-indicator';
import { IntegrationManagementModule } from '../integration-management/integration-management.module';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    IntegrationManagementModule,
  ],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, ExternalServicesHealthIndicator],
})
export class HealthModule {}
