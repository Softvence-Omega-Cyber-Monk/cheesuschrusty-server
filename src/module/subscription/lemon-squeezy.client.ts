import axios, { AxiosInstance } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { DynamicConfigService } from 'src/module/integration-management/dynamic-config.service';
import { CredentialProvider } from '@prisma/client';

@Injectable()
export class LemonSqueezyClient {
  private readonly logger = new Logger(LemonSqueezyClient.name);

  constructor(private readonly dynamicConfig: DynamicConfigService) {}

  async getClient(): Promise<AxiosInstance> {
    const credentials = await this.dynamicConfig.getCredentials(CredentialProvider.LEMONSQUEEZY);

    if (!credentials || !credentials.api_key) {
      this.logger.error('Lemon Squeezy API Key not found.');
      throw new Error('Lemon Squeezy is not configured.');
    }

    return axios.create({
      baseURL: 'https://api.lemonsqueezy.com/v1',
      headers: {
        Authorization: `Bearer ${String(credentials.api_key)}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
    });
  }
}
