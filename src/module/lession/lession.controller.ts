import { Controller } from '@nestjs/common';
import { LessionService } from './lession.service';

@Controller('lession')
export class LessionController {
  constructor(private readonly lessionService: LessionService) {}
}
