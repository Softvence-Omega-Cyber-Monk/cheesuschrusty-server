import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPlansController } from './subscription-plan.controller';
import { SubscriptionPlanService } from './subscription-plan.service';

describe('SubscriptionPlanController', () => {
  let controller: SubscriptionPlansController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionPlansController],
      providers: [SubscriptionPlanService],
    }).compile();

    controller = module.get<SubscriptionPlansController>(
      SubscriptionPlansController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
