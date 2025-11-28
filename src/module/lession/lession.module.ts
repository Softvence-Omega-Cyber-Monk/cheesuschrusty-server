import { Module } from '@nestjs/common';
import { LessionService } from './lession.service';
import { LessonController } from './lession.controller';
import { LessonAdminController } from './lesson.admin.controller';


@Module({
  controllers: [LessonController,LessonAdminController],
  providers: [LessionService],
})
export class LessionModule {}
