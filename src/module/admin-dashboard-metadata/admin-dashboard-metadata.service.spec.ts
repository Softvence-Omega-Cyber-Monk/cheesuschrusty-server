import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardMetadataService } from './admin-dashboard-metadata.service';

describe('AdminDashboardMetadataService', () => {
  let service: AdminDashboardMetadataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminDashboardMetadataService],
    }).compile();

    service = module.get<AdminDashboardMetadataService>(AdminDashboardMetadataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
