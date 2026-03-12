import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CredentialProvider, Prisma } from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { RecordIntegrationUsageDto } from './dto/record-integration-usage.dto';

type CredentialPayload = Record<string, string | number | boolean>;

@Injectable()
export class IntegrationManagementService {
  private readonly logger = new Logger(IntegrationManagementService.name);
  private readonly supportedProviders = [
    CredentialProvider.OPENAI,
    CredentialProvider.GROK,
    CredentialProvider.LEMONSQUEEZY,
    CredentialProvider.CLOUDINARY,
  ];

  constructor(private readonly prisma: PrismaService) {}

  async listCredentials() {
    const records = await this.prisma.integrationCredential.findMany({
      orderBy: { provider: 'asc' },
    });

    return this.supportedProviders.map((provider) => {
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
        encryptedPayload: this.encrypt(normalizedPayload),
        payloadHash,
        fieldNames: Object.keys(credentials).sort(),
        isActive: true,
        lastRotatedAt: new Date(),
      },
      create: {
        provider,
        encryptedPayload: this.encrypt(normalizedPayload),
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

    if (!record) return null;

    return JSON.parse(
      this.decrypt(record.encryptedPayload),
    ) as CredentialPayload;
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
        this.decrypt(encryptedPayload),
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

  private encrypt(value: string) {
    const encryptionKey = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decrypt(value: string) {
    const encryptionKey = this.getEncryptionKey();
    const [iv, tag, encrypted] = value.split(':');

    if (!iv || !tag || !encrypted) {
      throw new InternalServerErrorException(
        'Stored credential payload is invalid.',
      );
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey,
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private getEncryptionKey() {
    const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;

    if (!secret) {
      throw new InternalServerErrorException(
        'CREDENTIAL_ENCRYPTION_KEY is not configured.',
      );
    }

    return createHash('sha256').update(secret).digest();
  }

  private maskValue(value: string) {
    if (value.length <= 6) {
      return '*'.repeat(value.length);
    }

    return `${value.slice(0, 3)}${'*'.repeat(Math.max(4, value.length - 6))}${value.slice(-3)}`;
  }
}
