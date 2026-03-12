import { Test, TestingModule } from '@nestjs/testing';
import { LessionService } from './lession.service';

describe('LessionService', () => {
  let service: LessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LessionService],
    }).compile();

    service = module.get<LessionService>(LessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
