import { Module } from '@nestjs/common';
import { BrandingSettingsService } from './branding-settings.service';
import { BrandingSettingsController } from './branding-settings.controller';
import { CloudinaryModule } from 'src/common/service/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [BrandingSettingsController],
  providers: [BrandingSettingsService],
})
export class BrandingSettingsModule {}
