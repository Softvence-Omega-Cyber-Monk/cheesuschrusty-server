import { Module } from '@nestjs/common';
import { CloudinaryProvider } from 'src/shared/cloudinary/cloudinary.provider';


@Module({
  providers: [CloudinaryProvider],
  exports: [CloudinaryProvider],
})
export class CloudinaryModule {}
