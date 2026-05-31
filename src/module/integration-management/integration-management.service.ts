import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CredentialProvider, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/service/prisma/prisma.service';
import { EncryptionService } from '../../common/service/encryption/encryption.service';
import { RecordIntegrationUsageDto } from './dto/record-integration-usage.dto';
import axios from 'axios';

type CredentialPayload = Record<string, string | number | boolean>;

@Injectable()
export class IntegrationManagementService {
  private readonly logger = new Logger(IntegrationManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  // ... (listCredentials, upsertCredential, getDecryptedCredential stay same)

  async revealCredentials(
    userId: string,
    provider: CredentialProvider,
    password: string,
  ) {
    // 1. Verify User exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is invalid or inactive.');
    }

    // 2. Verify Password (Step-up authentication)
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      this.logger.warn(
        `Failed credential reveal attempt for ${provider} by User ${userId}`,
      );
      throw new UnauthorizedException(
        'Invalid password for credential reveal.',
      );
    }

    // 3. Get Credentials
    const record = await this.prisma.integrationCredential.findUnique({
      where: { provider },
    });

    if (!record) {
      throw new NotFoundException(`No credentials found for ${provider}.`);
    }

    // 4. Decrypt Payload
    let decrypted: CredentialPayload;
    try {
      decrypted = JSON.parse(
        this.encryptionService.decrypt(record.encryptedPayload),
      ) as CredentialPayload;
    } catch (error) {
      this.logger.error(`Decryption failed for ${provider}`, error);
      throw new InternalServerErrorException('Failed to decrypt credentials.');
    }

    // 5. Audit Log (using IntegrationUsageStat)
    await this.prisma.integrationUsageStat.create({
      data: {
        provider,
        operation: 'CREDENTIAL_REVEAL',
        requestCount: 1,
        metadata: {
          adminId: userId,
          revealedAt: new Date(),
          reason: 'Admin requested raw credential view',
        },
      },
    });

    this.logger.log(
      `Sensitive credentials for ${provider} revealed to Admin ${userId}`,
    );

    return decrypted;
  }

  async listCredentials() {
    const records = await this.prisma.integrationCredential.findMany({
      orderBy: { provider: 'asc' },
    });

    return Object.values(CredentialProvider).map((provider) => {
      const record = records.find((item) => item.provider === provider);

      if (!record) {
        return {
          provider,
          configured: false,
          isActive: false,
          fieldNames: [],
          maskedCredentials: {},
          lastRotatedAt: null,
          updatedAt: null,
        };
      }

      return {
        provider,
        configured: true,
        isActive: record.isActive,
        fieldNames: record.fieldNames,
        maskedCredentials: this.getMaskedPayload(record.encryptedPayload),
        lastRotatedAt: record.lastRotatedAt,
        updatedAt: record.updatedAt,
      };
    });
  }

  async upsertCredential(
    provider: CredentialProvider,
    credentials: CredentialPayload,
  ) {
    const normalizedPayload = this.normalizePayload(credentials);
    const payloadHash = createHash('sha256')
      .update(normalizedPayload)
      .digest('hex');

    const data = await this.prisma.integrationCredential.upsert({
      where: { provider },
      update: {
        encryptedPayload: this.encryptionService.encrypt(normalizedPayload),
        payloadHash,
        fieldNames: Object.keys(credentials).sort(),
        isActive: true,
        lastRotatedAt: new Date(),
      },
      create: {
        provider,
        encryptedPayload: this.encryptionService.encrypt(normalizedPayload),
        payloadHash,
        fieldNames: Object.keys(credentials).sort(),
        isActive: true,
        lastRotatedAt: new Date(),
      },
    });

    return {
      provider: data.provider,
      configured: true,
      isActive: data.isActive,
      fieldNames: data.fieldNames,
      payloadHash: data.payloadHash,
      lastRotatedAt: data.lastRotatedAt,
      updatedAt: data.updatedAt,
      maskedCredentials: this.getMaskedPayload(data.encryptedPayload),
    };
  }

  async getDecryptedCredential(provider: CredentialProvider) {
    const record = await this.prisma.integrationCredential.findUnique({
      where: { provider },
    });

    if (!record || !record.isActive) return null;

    try {
      return JSON.parse(
        this.encryptionService.decrypt(record.encryptedPayload),
      ) as CredentialPayload;
    } catch (error) {
      this.logger.error(`Failed to decrypt credentials for ${provider}`, error);
      return null;
    }
  }

  async getAllDecryptedCredentials(): Promise<
    (CredentialPayload & { provider: string })[]
  > {
    const records = await this.prisma.integrationCredential.findMany({
      where: { isActive: true },
    });

    const results: (CredentialPayload & { provider: string })[] = [];

    for (const record of records) {
      try {
        const decrypted = JSON.parse(
          this.encryptionService.decrypt(record.encryptedPayload),
        ) as CredentialPayload;

        results.push({
          provider: record.provider.toLowerCase(),
          ...decrypted,
        });
      } catch (error) {
        this.logger.error(
          `Failed to decrypt credentials for ${record.provider} during bulk sync`,
          error,
        );
      }
    }

    // Log the bulk sync event
    if (results.length > 0) {
      await this.recordUsage({
        provider: CredentialProvider.OPENAI, // Use a default or system provider for bulk logs
        operation: 'BULK_CREDENTIAL_SYNC',
        metadata: {
          timestamp: new Date(),
          type: 'external_server_bulk_request',
          providerCount: results.length,
        },
      });
    }

    return results;
  }

  /**
   * Retrieves a list of all providers that have active credentials
   * and are traditionally used for AI operations.
   */
  async getActiveAIProviders() {
    const aiSlugs = [
      CredentialProvider.OPENAI,
      CredentialProvider.GEMINI,
      CredentialProvider.GROK,
      CredentialProvider.OPENROUTER,
    ];

    const activeCredentials = await this.prisma.integrationCredential.findMany({
      where: {
        provider: { in: aiSlugs },
        isActive: true,
      },
      select: {
        provider: true,
      },
    });

    return activeCredentials.map((c) => c.provider);
  }

  async recordUsage(dto: RecordIntegrationUsageDto) {
    return this.prisma.integrationUsageStat.create({
      data: {
        provider: dto.provider,
        operation: dto.operation,
        requestCount: dto.requestCount ?? 1,
        inputUnits: dto.inputUnits,
        outputUnits: dto.outputUnits,
        totalUnits: dto.totalUnits,
        costUsd: dto.costUsd,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      },
    });
  }

  async getUsageStats(filters: {
    provider?: CredentialProvider;
    from?: string;
    to?: string;
  }) {
    const where = this.buildUsageWhere(filters);

    return this.prisma.integrationUsageStat.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
    });
  }

  async getUsageSummary(filters: {
    provider?: CredentialProvider;
    from?: string;
    to?: string;
  }) {
    const where = this.buildUsageWhere(filters);
    const stats = await this.prisma.integrationUsageStat.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
    });

    const totals = stats.reduce(
      (acc, item) => {
        acc.totalRequests += item.requestCount;
        acc.totalCostUsd += item.costUsd ?? 0;
        acc.totalInputUnits += item.inputUnits ?? 0;
        acc.totalOutputUnits += item.outputUnits ?? 0;
        acc.totalUnits += item.totalUnits ?? 0;
        return acc;
      },
      {
        totalRequests: 0,
        totalCostUsd: 0,
        totalInputUnits: 0,
        totalOutputUnits: 0,
        totalUnits: 0,
      },
    );

    const breakdownMap = new Map<
      CredentialProvider,
      {
        provider: CredentialProvider;
        requestCount: number;
        totalCostUsd: number;
        totalInputUnits: number;
        totalOutputUnits: number;
        totalUnits: number;
      }
    >();

    for (const item of stats) {
      const existing = breakdownMap.get(item.provider) ?? {
        provider: item.provider,
        requestCount: 0,
        totalCostUsd: 0,
        totalInputUnits: 0,
        totalOutputUnits: 0,
        totalUnits: 0,
      };

      existing.requestCount += item.requestCount;
      existing.totalCostUsd += item.costUsd ?? 0;
      existing.totalInputUnits += item.inputUnits ?? 0;
      existing.totalOutputUnits += item.outputUnits ?? 0;
      existing.totalUnits += item.totalUnits ?? 0;
      breakdownMap.set(item.provider, existing);
    }

    return {
      filters,
      totals,
      breakdown: Array.from(breakdownMap.values()),
      recordCount: stats.length,
    };
  }

  private buildUsageWhere(filters: {
    provider?: CredentialProvider;
    from?: string;
    to?: string;
  }): Prisma.IntegrationUsageStatWhereInput {
    const where: Prisma.IntegrationUsageStatWhereInput = {};

    if (filters.provider) {
      where.provider = filters.provider;
    }

    if (filters.from || filters.to) {
      where.recordedAt = {};

      if (filters.from) {
        where.recordedAt.gte = new Date(filters.from);
      }

      if (filters.to) {
        where.recordedAt.lte = new Date(filters.to);
      }
    }

    return where;
  }

  private getMaskedPayload(encryptedPayload: string) {
    try {
      const payload = JSON.parse(
        this.encryptionService.decrypt(encryptedPayload),
      ) as CredentialPayload;
      return Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [
          key,
          this.maskValue(String(value)),
        ]),
      );
    } catch (error) {
      this.logger.error(
        'Failed to decrypt credential payload for masking.',
        error instanceof Error ? error.stack : String(error),
      );
      return {};
    }
  }

  private normalizePayload(payload: CredentialPayload) {
    const sortedEntries = Object.entries(payload).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    return JSON.stringify(Object.fromEntries(sortedEntries));
  }

  private maskValue(value: string) {
    if (value.length <= 6) {
      return '*'.repeat(value.length);
    }

    return `${value.slice(0, 3)}${'*'.repeat(Math.max(4, value.length - 6))}${value.slice(-3)}`;
  }

  async testProviderConnection(provider: CredentialProvider) {
    // 1. Get credentials (DB first, fallback to env)
    let credentials = await this.getDecryptedCredential(provider);
    if (!credentials) {
      // Fallback logic
      credentials = this.getEnvFallback(provider);
    }

    if (!credentials || Object.keys(credentials).length === 0) {
      return {
        status: 'unconfigured',
        message: `No credentials configured for provider: ${provider}`,
      };
    }

    try {
      switch (provider) {
        case CredentialProvider.OPENAI: {
          const apiKey = credentials.api_key;
          if (!apiKey) {
            return { status: 'unconfigured', message: 'API key is missing' };
          }
          await axios.get('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 5000,
          });
          break;
        }
        case CredentialProvider.GEMINI: {
          const apiKey = credentials.api_key;
          if (!apiKey) {
            return { status: 'unconfigured', message: 'API key is missing' };
          }
          await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            {
              timeout: 5000,
            },
          );
          break;
        }
        case CredentialProvider.GROK: {
          const apiKey = credentials.api_key;
          if (!apiKey) {
            return { status: 'unconfigured', message: 'API key is missing' };
          }
          await axios.get('https://api.x.ai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 5000,
          });
          break;
        }
        case CredentialProvider.OPENROUTER: {
          const apiKey = credentials.api_key;
          if (!apiKey) {
            return { status: 'unconfigured', message: 'API key is missing' };
          }
          await axios.get('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 5000,
          });
          break;
        }
        case CredentialProvider.STRIPE: {
          const secretKey = credentials.secret_key;
          if (!secretKey) {
            return { status: 'unconfigured', message: 'Secret key is missing' };
          }
          await axios.get('https://api.stripe.com/v1/balance', {
            headers: { Authorization: `Bearer ${secretKey}` },
            timeout: 5000,
          });
          break;
        }
        case CredentialProvider.LEMONSQUEEZY: {
          const apiKey = credentials.api_key;
          if (!apiKey) {
            return { status: 'unconfigured', message: 'API key is missing' };
          }
          await axios.get('https://api.lemonsqueezy.com/v1/stores', {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/vnd.api+json',
              'Content-Type': 'application/vnd.api+json',
            },
            timeout: 5000,
          });
          break;
        }
        case CredentialProvider.CLOUDINARY: {
          const cloudName = credentials.cloud_name;
          if (!cloudName) {
            return { status: 'unconfigured', message: 'Cloud name is missing' };
          }
          await axios.get(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
            timeout: 5000,
          });
          break;
        }
        default:
          return {
            status: 'unhealthy',
            message: `Unknown provider: ${provider as string}`,
          };
      }

      return {
        status: 'healthy',
        message: `Successfully connected to ${provider}`,
      };
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as unknown;
        errorMessage =
          typeof responseData === 'string'
            ? responseData
            : JSON.stringify(responseData);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }

      return {
        status: 'unhealthy',
        message: `Failed connection test for ${provider}: ${errorMessage}`,
      };
    }
  }

  private getEnvFallback(provider: CredentialProvider): CredentialPayload {
    switch (provider) {
      case CredentialProvider.OPENAI:
        return {
          api_key: process.env.OPENAI_API_KEY || '',
          model_name: process.env.OPENAI_MODEL || 'gpt-4o',
        };
      case CredentialProvider.GEMINI:
        return {
          api_key: process.env.GEMINI_API_KEY || '',
          model_name: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
        };
      case CredentialProvider.GROK:
        return {
          api_key: process.env.GROK_API_KEY || '',
          model_name: process.env.GROK_MODEL || 'grok-1',
        };
      case CredentialProvider.STRIPE:
        return {
          secret_key: process.env.STRIPE_SECRET_KEY || '',
          publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || '',
          webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || '',
        };
      case CredentialProvider.LEMONSQUEEZY:
        return {
          api_key: process.env.LEMON_SQUEEZY_API_KEY || '',
          store_id: process.env.LEMON_SQUEEZY_STORE_ID || '',
          webhook_secret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '',
          variant_id: process.env.LEMON_VARIANT_ID_MONTHLY || '',
        };
      case CredentialProvider.CLOUDINARY:
        return {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
          api_key: process.env.CLOUDINARY_API_KEY || '',
          api_secret: process.env.CLOUDINARY_API_SECRET || '',
        };
      case CredentialProvider.OPENROUTER:
        return {
          api_key: process.env.OPENROUTER_API_KEY || '',
          model_name: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-opus',
        };
      default:
        return {};
    }
  }
}
