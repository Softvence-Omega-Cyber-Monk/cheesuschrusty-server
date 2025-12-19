import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CefrConfidenceService } from 'src/common/service/cefr/cefr-confidence.service';

@Module({
  providers: [UserService,CefrConfidenceService],
  controllers: [UserController],
})
export class UserModule {}
