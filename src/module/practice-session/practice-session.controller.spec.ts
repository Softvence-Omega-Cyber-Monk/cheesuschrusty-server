import { Test, TestingModule } from '@nestjs/testing';
import { PracticeSessionController } from './practice-session.controller';
import { PracticeSessionService } from './practice-session.service';

describe('PracticeSessionController', () => {
  let controller: PracticeSessionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PracticeSessionController],
      providers: [PracticeSessionService],
    }).compile();

    controller = module.get<PracticeSessionController>(PracticeSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
