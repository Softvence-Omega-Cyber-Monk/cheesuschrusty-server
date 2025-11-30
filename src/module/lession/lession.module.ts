import { Module } from '@nestjs/common';
import { LessionService } from './lession.service';
import { LessonController } from './lession.controller';
import { LessonAdminController } from './lesson.admin.controller';
import { QuestionSetModule } from '../question-set/question-set.module';


@Module({
  imports: [QuestionSetModule],
  controllers: [LessonController,LessonAdminController],
  providers: [LessionService],
})
export class LessionModule {}
