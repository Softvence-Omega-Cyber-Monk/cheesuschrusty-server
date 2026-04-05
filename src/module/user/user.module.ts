import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CefrConfidenceService } from 'src/common/service/cefr/cefr-confidence.service';

@Module({
  imports: [HttpModule],
  providers: [UserService, CefrConfidenceService],
  controllers: [UserController],
})
export class UserModule {}
