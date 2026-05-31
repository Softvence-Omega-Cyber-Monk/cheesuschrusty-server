import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationManagementController } from './integration-management.controller';
import { IntegrationManagementService } from './integration-management.service';
import { CredentialProvider } from '@prisma/client';
import { Response } from 'express';

describe('IntegrationManagementController', () => {
  let controller: IntegrationManagementController;
  let service: IntegrationManagementService;

  const mockResponse = () => {
    const status = jest.fn();
    const json = jest.fn();
    const res = {
      status: status.mockReturnThis(),
      json: json.mockReturnThis(),
    } as unknown as Response;
    return { res, status, json };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationManagementController],
      providers: [
        {
          provide: IntegrationManagementService,
          useValue: {
            testProviderConnection: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IntegrationManagementController>(
      IntegrationManagementController,
    );
    service = module.get<IntegrationManagementService>(
      IntegrationManagementService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('testCredential', () => {
    it('should successfully test a healthy provider', async () => {
      const { res, status, json } = mockResponse();
      const testConnectionSpy = jest
        .spyOn(service, 'testProviderConnection')
        .mockResolvedValue({ status: 'healthy', message: 'Connected' });

      await controller.testCredential('openai', res);

      expect(testConnectionSpy).toHaveBeenCalledWith(CredentialProvider.OPENAI);
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Connected',
          data: {
            provider: 'openai',
            status: 'healthy',
          },
        }),
      );
    });

    it('should return error for invalid provider', async () => {
      const { res } = mockResponse();
      await expect(
        controller.testCredential('invalid-provider', res),
      ).rejects.toThrow();
    });
  });
});
