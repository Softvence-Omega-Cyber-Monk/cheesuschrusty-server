import { Test, TestingModule } from '@nestjs/testing';
import { BrandingSettingsController } from './branding-settings.controller';
import { BrandingSettingsService } from './branding-settings.service';

describe('BrandingSettingsController', () => {
  let controller: BrandingSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandingSettingsController],
      providers: [BrandingSettingsService],
    }).compile();

    controller = module.get<BrandingSettingsController>(BrandingSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
