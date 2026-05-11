import { Injectable, Logger } from '@nestjs/common';
import { CredentialProvider } from '@prisma/client';
import { IntegrationManagementService } from './integration-management.service';

@Injectable()
export class DynamicConfigService {
  private readonly logger = new Logger(DynamicConfigService.name);

  constructor(
    private readonly integrationService: IntegrationManagementService,
  ) {}

  async getCredentials(
    provider: CredentialProvider,
  ): Promise<Record<string, any>> {
    const dbCredentials =
      await this.integrationService.getDecryptedCredential(provider);

    if (dbCredentials) {
      return dbCredentials;
    }

    return this.getEnvFallback(provider);
  }

  private getEnvFallback(provider: CredentialProvider): Record<string, any> {
    switch (provider) {
      case CredentialProvider.OPENAI:
        return {
          api_key: process.env.OPENAI_API_KEY,
          model_name: process.env.OPENAI_MODEL || 'gpt-4o',
        };
      case CredentialProvider.GEMINI:
        return {
          api_key: process.env.GEMINI_API_KEY,
          model_name: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
        };
      case CredentialProvider.GROK:
        return {
          api_key: process.env.GROK_API_KEY,
          model_name: process.env.GROK_MODEL || 'grok-1',
        };
      case CredentialProvider.STRIPE:
        return {
          secret_key: process.env.STRIPE_SECRET_KEY,
          publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
          webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
        };
      case CredentialProvider.LEMONSQUEEZY:
        return {
          api_key: process.env.LEMON_SQUEEZY_API_KEY,
          store_id: process.env.LEMON_SQUEEZY_STORE_ID,
          webhook_secret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET,
          variant_id: process.env.LEMON_VARIANT_ID_MONTHLY,
        };
      case CredentialProvider.CLOUDINARY:
        return {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        };
      default:
        return {};
    }
  }
}
