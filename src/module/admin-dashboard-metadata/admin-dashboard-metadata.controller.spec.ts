import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardMetadataController } from './admin-dashboard-metadata.controller';
import { AdminDashboardMetadataService } from './admin-dashboard-metadata.service';

describe('AdminDashboardMetadataController', () => {
  let controller: AdminDashboardMetadataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardMetadataController],
      providers: [AdminDashboardMetadataService],
    }).compile();

    controller = module.get<AdminDashboardMetadataController>(AdminDashboardMetadataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
