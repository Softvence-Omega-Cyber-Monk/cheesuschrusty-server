import { Controller } from '@nestjs/common';
import { FlashcardService } from './flashcard.service';

@Controller('flashcard')
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}
}
