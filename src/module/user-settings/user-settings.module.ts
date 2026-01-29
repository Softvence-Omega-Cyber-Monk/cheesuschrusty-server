import { Module } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';

@Module({
  controllers: [UserSettingsController],
  providers: [UserSettingsService],
  exports: [UserSettingsService],
})
export class UserSettingsModule {}