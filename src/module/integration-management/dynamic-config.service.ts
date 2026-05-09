import { Injectable, Logger } from '@nestjs/common';
import { CredentialProvider } from '@prisma/client';
import { IntegrationManagementService } from './integration-management.service';

@Injectable()
export class DynamicConfigService {
  private readonly logger = new Logger(DynamicConfigService.name);

  constructor(private readonly integrationService: IntegrationManagementService) {}

  async getCredentials(provider: CredentialProvider): Promise<Record<string, any>> {
    const dbCredentials = await this.integrationService.getDecryptedCredential(provider);
    
    if (dbCredentials) {
      return dbCredentials;
    }

    // Fallback to environment variables if not found in database
    return this.getEnvFallback(provider);
  }

  private getEnvFallback(provider: CredentialProvider): Record<string, any> {
    switch (provider) {
      case CredentialProvider.OPENAI:
        return { api_key: process.env.OPENAI_API_KEY };
      case (CredentialProvider as any).GEMINI:
        return { api_key: process.env.GEMINI_API_KEY };
      case CredentialProvider.GROK:
        return { api_key: process.env.GROK_API_KEY };
      case (CredentialProvider as any).STRIPE:
        return { 
          secret_key: process.env.STRIPE_SECRET_KEY,
          webhook_secret: process.env.STRIPE_WEBHOOK_SECRET 
        };
      case CredentialProvider.LEMONSQUEEZY:
        return { 
          api_key: process.env.LEMON_SQUEEZY_API_KEY,
          store_id: process.env.LEMON_SQUEEZY_STORE_ID,
          webhook_secret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
        };
      case CredentialProvider.CLOUDINARY:
        return {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        };
      default:
        return {};
    }
  }
}
