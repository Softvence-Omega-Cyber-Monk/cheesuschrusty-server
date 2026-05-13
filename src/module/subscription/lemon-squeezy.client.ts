import axios, { AxiosInstance } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { DynamicConfigService } from 'src/module/integration-management/dynamic-config.service';
import { CredentialProvider } from '@prisma/client';

export interface LemonSqueezyCredentials {
  api_key: string;
  store_id: string | number;
  webhook_secret?: string;
  variant_id?: string | number;
}

@Injectable()
export class LemonSqueezyClient {
  private readonly logger = new Logger(LemonSqueezyClient.name);

  constructor(private readonly dynamicConfig: DynamicConfigService) {}

  async getCredentials(): Promise<LemonSqueezyCredentials> {
    const credentials = (await this.dynamicConfig.getCredentials(
      CredentialProvider.LEMONSQUEEZY,
    )) as unknown as LemonSqueezyCredentials;
    if (!credentials || !credentials.api_key || !credentials.store_id) {
      this.logger.error('Lemon Squeezy configuration is incomplete.');
      throw new Error('Lemon Squeezy is not fully configured.');
    }
    return credentials;
  }

  async getClient(): Promise<AxiosInstance> {
    const credentials = await this.getCredentials();

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
