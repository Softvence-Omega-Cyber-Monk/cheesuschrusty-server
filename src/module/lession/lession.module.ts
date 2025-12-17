import { Module } from '@nestjs/common';
import { LessionService } from './lession.service';
import { LessonController } from './lession.controller';
import { LessonAdminController } from './lesson.admin.controller';
import { QuestionSetModule } from '../question-set/question-set.module';
import { PracticeSessionModule } from '../practice-session/practice-session.module';


@Module({
  imports: [QuestionSetModule,PracticeSessionModule],
  controllers: [LessonController,LessonAdminController],
  providers: [LessionService],
})
export class LessionModule {}
