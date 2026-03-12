import { Test, TestingModule } from '@nestjs/testing';
import { SecuritySettingsService } from './security-settings.service';

describe('SecuritySettingsService', () => {
  let service: SecuritySettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecuritySettingsService],
    }).compile();

    service = module.get<SecuritySettingsService>(SecuritySettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
