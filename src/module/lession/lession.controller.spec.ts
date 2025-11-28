import { Test, TestingModule } from '@nestjs/testing';
import { LessionController } from './lession.controller';
import { LessionService } from './lession.service';

describe('LessionController', () => {
  let controller: LessionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessionController],
      providers: [LessionService],
    }).compile();

    controller = module.get<LessionController>(LessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
