import { Module } from '@nestjs/common';
import { LessionService } from './lession.service';
import { LessionController } from './lession.controller';

@Module({
  controllers: [LessionController],
  providers: [LessionService],
})
export class LessionModule {}
