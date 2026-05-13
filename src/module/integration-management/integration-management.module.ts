import { Module } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { IntegrationManagementController } from './integration-management.controller';
import { IntegrationManagementService } from './integration-management.service';
import { DynamicConfigService } from './dynamic-config.service';
import { AIBridgeController } from './ai-bridge.controller';

@Module({
  controllers: [IntegrationManagementController, AIBridgeController],
  providers: [
    IntegrationManagementService,
    PrismaService,
    DynamicConfigService,
  ],
  exports: [IntegrationManagementService, DynamicConfigService],
})
export class IntegrationManagementModule {}
