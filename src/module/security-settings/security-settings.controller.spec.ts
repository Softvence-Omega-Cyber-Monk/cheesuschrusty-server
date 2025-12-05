import { Test, TestingModule } from '@nestjs/testing';
import { SecuritySettingsController } from './security-settings.controller';
import { SecuritySettingsService } from './security-settings.service';

describe('SecuritySettingsController', () => {
  let controller: SecuritySettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecuritySettingsController],
      providers: [SecuritySettingsService],
    }).compile();

    controller = module.get<SecuritySettingsController>(SecuritySettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
