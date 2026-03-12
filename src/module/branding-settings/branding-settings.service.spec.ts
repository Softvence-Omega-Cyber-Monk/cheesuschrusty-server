import { Test, TestingModule } from '@nestjs/testing';
import { BrandingSettingsService } from './branding-settings.service';

describe('BrandingSettingsService', () => {
  let service: BrandingSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrandingSettingsService],
    }).compile();

    service = module.get<BrandingSettingsService>(BrandingSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
