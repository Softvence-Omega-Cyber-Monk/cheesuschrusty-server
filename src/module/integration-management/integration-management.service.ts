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

type CredentialPayload = Record<string, string | number | boolean>;

@Injectable()
export class IntegrationManagementService {
  private readonly logger = new Logger(IntegrationManagementService.name);
  private readonly supportedProviders = [
    CredentialProvider.OPENAI,
    CredentialProvider.GROK,
    (CredentialProvider as any).GEMINI,
    (CredentialProvider as any).STRIPE,
    CredentialProvider.LEMONSQUEEZY,
    CredentialProvider.CLOUDINARY,
  ] as CredentialProvider[];

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
      this.logger.warn(`Failed credential reveal attempt for ${provider} by User ${userId}`);
      throw new UnauthorizedException('Invalid password for credential reveal.');
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
      );
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

    this.logger.log(`Sensitive credentials for ${provider} revealed to Admin ${userId}`);

    return decrypted;
  }

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
}
