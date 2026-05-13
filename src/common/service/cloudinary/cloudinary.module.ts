import { Global, Module } from '@nestjs/common';
import { IntegrationManagementModule } from 'src/module/integration-management/integration-management.module';
import { CloudinaryService } from './cloudinary.service';

@Global()
@Module({
  imports: [IntegrationManagementModule],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
