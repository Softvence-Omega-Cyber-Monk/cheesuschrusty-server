import { Test, TestingModule } from '@nestjs/testing';
import { QuestionSetController } from './question-set.controller';
import { QuestionSetService } from './question-set.service';

describe('QuestionSetController', () => {
  let controller: QuestionSetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionSetController],
      providers: [QuestionSetService],
    }).compile();

    controller = module.get<QuestionSetController>(QuestionSetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
