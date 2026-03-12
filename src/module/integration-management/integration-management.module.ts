import { Module } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { IntegrationManagementController } from './integration-management.controller';
import { IntegrationManagementService } from './integration-management.service';

@Module({
  controllers: [IntegrationManagementController],
  providers: [IntegrationManagementService, PrismaService],
  exports: [IntegrationManagementService],
})
export class IntegrationManagementModule {}
