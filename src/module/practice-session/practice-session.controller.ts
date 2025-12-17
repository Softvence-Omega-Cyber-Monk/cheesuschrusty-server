import { Controller } from '@nestjs/common';
import { PracticeSessionService } from './practice-session.service';

@Controller('practice-session')
export class PracticeSessionController {
  constructor(private readonly practiceSessionService: PracticeSessionService) {}
}
