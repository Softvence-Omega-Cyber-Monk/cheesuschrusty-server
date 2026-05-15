import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { DynamicConfigService } from '../integration-management/dynamic-config.service';
import { CredentialProvider } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class ExternalServicesHealthIndicator extends HealthIndicator {
  constructor(private readonly dynamicConfig: DynamicConfigService) {
    super();
  }

  async checkService(
    key: string,
    provider: CredentialProvider,
  ): Promise<HealthIndicatorResult> {
    try {
      // Fetch credentials to see if they are configured
      const credentials = await this.dynamicConfig.getCredentials(provider);

      if (!credentials || Object.keys(credentials).length === 0) {
        return this.getStatus(key, true, {
          status: 'unconfigured',
          message: 'No credentials found',
        });
      }

      // Basic ping test for the provider
      const providerStr = String(provider).toUpperCase();
      if (providerStr === 'STRIPE') {
        // Stripe base URL returns 404 but proves service is alive
        await axios.get('https://api.stripe.com', {
          timeout: 3000,
          validateStatus: () => true,
        });
      } else if (providerStr === 'CLOUDINARY') {
        await axios.get('https://cloudinary.com', {
          timeout: 3000,
          validateStatus: () => true,
        });
      }

      return this.getStatus(key, true);
    } catch (error: unknown) {
      // NOTE: We return true for the health indicator itself (so we don't throw 503)
      // but we report the internal status as 'down' with the error message.
      const err = error as Error;
      return this.getStatus(key, true, {
        status: 'down',
        message: err.message,
        help: 'App will continue to function without this service.',
      });
    }
  }
}
