import { Module } from '@nestjs/common';
import { SecuritySettingsService } from './security-settings.service';
import { SecuritySettingsController } from './security-settings.controller';

@Module({
  controllers: [SecuritySettingsController],
  providers: [SecuritySettingsService],
})
export class SecuritySettingsModule {}
