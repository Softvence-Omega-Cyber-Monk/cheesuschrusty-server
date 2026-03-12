import { Test, TestingModule } from '@nestjs/testing';
import { LessonController } from './lession.controller';
import { LessionService } from './lession.service';

describe('LessionController', () => {
  let controller: LessonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonController],
      providers: [LessionService],
    }).compile();

    controller = module.get<LessonController>(LessonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
