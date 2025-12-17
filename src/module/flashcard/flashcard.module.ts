import { Module } from '@nestjs/common';
import { FlashcardService } from './flashcard.service';
import { FlashcardController } from './flashcard.controller';
import { PracticeSessionModule } from '../practice-session/practice-session.module';

@Module({
  imports: [PracticeSessionModule],
  controllers: [FlashcardController],
  providers: [FlashcardService],
})
export class FlashcardModule {}
