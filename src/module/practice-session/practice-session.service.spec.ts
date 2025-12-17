import { Test, TestingModule } from '@nestjs/testing';
import { PracticeSessionService } from './practice-session.service';

describe('PracticeSessionService', () => {
  let service: PracticeSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PracticeSessionService],
    }).compile();

    service = module.get<PracticeSessionService>(PracticeSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
