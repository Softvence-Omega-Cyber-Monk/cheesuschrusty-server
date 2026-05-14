import {
  Body,
  Controller,
  Get,
  HttpStatus,
  ParseEnumPipe,
  Post,
  Put,
  Query,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CredentialProvider, Role } from '@prisma/client';
import { Response } from 'express';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import sendResponse from '../utils/sendResponse';
import { RecordIntegrationUsageDto } from './dto/record-integration-usage.dto';
import { UpsertIntegrationCredentialDto } from './dto/upsert-integration-credential.dto';
import { IntegrationManagementService } from './integration-management.service';

import { RevealCredentialDto } from './dto/reveal-credential.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorators';
import { CredentialSyncGuard } from './guards/credential-sync.guard';

@ApiTags('Integration Management')
@Controller('integration-management')
@Roles(Role.SUPER_ADMIN)
export class IntegrationManagementController {
  constructor(
    private readonly integrationManagementService: IntegrationManagementService,
  ) {}

  @Post('credentials/:provider/reveal')
  @ApiOperation({
    summary:
      'Securely reveal raw credentials for a provider (requires password).',
    description: `Requires step-up authentication. The admin must provide their current password.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/integration-management/credentials/OPENAI/reveal \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"password": "your-admin-password"}'
    \`\`\``,
  })
  @ApiBody({ type: RevealCredentialDto })
  @ApiResponse({
    status: 200,
    description: 'Credentials revealed.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: { api_key: 'sk-proj-raw-key-here' },
      },
    },
  })
  async revealCredential(
    @Param('provider', new ParseEnumPipe(CredentialProvider))
    provider: CredentialProvider,
    @Body() dto: RevealCredentialDto,
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ) {
    const data = await this.integrationManagementService.revealCredentials(
      user.id,
      provider,
      dto.password,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message:
        'Credentials revealed successfully. This action has been logged.',
      data: {
        provider: provider.toLowerCase(),
        ...data,
      },
    });
  }

  @Get('available-ai-providers')
  @ApiOperation({ summary: 'Discover active AI providers.' })
  @ApiResponse({ status: 200, description: 'List of active AI slugs.' })
  async getActiveAIProviders(@Res() res: Response) {
    const providers =
      await this.integrationManagementService.getActiveAIProviders();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Active AI providers discovered.',
      data: providers.map((p) => p.toLowerCase()),
    });
  }

  @Get('credentials')
  @ApiOperation({
    summary: 'Get masked credential metadata for all providers.',
    description: `Lists all configured integrations with masked keys (e.g. sk-***abcd). 
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/integration-management/credentials \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'List of credentials retrieved.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: [{ provider: 'OPENAI', createdAt: '2026-05-09T...' }],
      },
    },
  })
  async getCredentials(@Res() res: Response) {
    const data = await this.integrationManagementService.listCredentials();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Integration credentials retrieved successfully.',
      data: data.map((item) => ({
        ...item,
        provider: item.provider.toLowerCase(),
      })),
    });
  }

  @Put('credentials/:provider')
  @ApiOperation({
    summary: 'Create or rotate encrypted credentials for a provider.',
    description: `Encrypts and stores service keys. Use the provider name in the URL.

    ### Sample Payloads per Provider:

    **OPENAI**
    \`\`\`json
    {
      "credentials": {
        "api_key": "sk-...",
        "model_name": "gpt-4o",
        "organization_id": "org-..."
      }
    }
    \`\`\`

    **GEMINI**
    \`\`\`json
    {
      "credentials": {
        "api_key": "AIza...",
        "model_name": "gemini-1.5-pro"
      }
    }
    \`\`\`

    **GROK**
    \`\`\`json
    {
      "credentials": {
        "api_key": "xai-...",
        "model_name": "grok-1"
      }
    }
    \`\`\`

    **STRIPE**
    \`\`\`json
    {
      "credentials": {
        "secret_key": "sk_test_...",
        "publishable_key": "pk_test_...",
        "webhook_secret": "whsec_..."
      }
    }
    \`\`\`

    **LEMONSQUEEZY**
    \`\`\`json
    {
      "credentials": {
        "api_key": "eyJ...",
        "store_id": "259513",
        "webhook_secret": "...",
        "variant_id": "1164228"
      }
    }
    \`\`\`

    **CLOUDINARY**
    \`\`\`json
    {
      "credentials": {
        "cloud_name": "...",
        "api_key": "...",
        "api_secret": "..."
      }
    }
    \`\`\`
    `,
  })
  @ApiBody({ type: UpsertIntegrationCredentialDto })
  @ApiResponse({ status: 200, description: 'Credentials stored.' })
  async upsertCredential(
    @Param('provider') provider: string,
    @Body() dto: UpsertIntegrationCredentialDto,
    @Res() res: Response,
  ) {
    const normalizedProvider = provider.toUpperCase() as CredentialProvider;

    if (!Object.values(CredentialProvider).includes(normalizedProvider)) {
      throw new BadRequestException(
        `Invalid provider: ${provider}. Must be one of: ${Object.values(CredentialProvider).join(', ')}`,
      );
    }

    const data = await this.integrationManagementService.upsertCredential(
      normalizedProvider,
      dto.credentials,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Integration credential stored securely.',
      data,
    });
  }

  @Post('usage')
  @ApiOperation({
    summary: 'Record a usage stat for an integration.',
    description: `Manually log token usage or costs for an external service.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/integration-management/usage \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"provider": "OPENAI", "operation": "chat", "totalUnits": 1000, "costUsd": 0.01}'
    \`\`\``,
  })
  @ApiBody({ type: RecordIntegrationUsageDto })
  @ApiResponse({ status: 201, description: 'Usage recorded.' })
  async recordUsage(
    @Body() dto: RecordIntegrationUsageDto,
    @Res() res: Response,
  ) {
    const data = await this.integrationManagementService.recordUsage(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Integration usage stat recorded successfully.',
      data,
    });
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Get detailed usage stat records.',
    description: `Retrieves a list of all logged usage events with optional filters.
    **Curl Example:**
    \`\`\`bash
    curl -X GET "http://localhost:5001/api/v1/integration-management/usage?provider=OPENAI" \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiQuery({ name: 'provider', required: false, enum: CredentialProvider })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getUsageStats(
    @Query('provider') provider: CredentialProvider | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const data = await this.integrationManagementService.getUsageStats({
      provider,
      from,
      to,
    });

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Integration usage stats retrieved successfully.',
      data,
    });
  }

  @Get('usage-summary')
  @ApiOperation({
    summary: 'Get aggregated usage summary.',
    description: `Returns totals and provider-specific breakdowns of costs and requests.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/integration-management/usage-summary \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiQuery({ name: 'provider', required: false, enum: CredentialProvider })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getUsageSummary(
    @Query('provider') provider: CredentialProvider | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const data = await this.integrationManagementService.getUsageSummary({
      provider,
      from,
      to,
    });

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Integration usage summary retrieved successfully.',
      data,
    });
  }

  @Public()
  @UseGuards(CredentialSyncGuard)
  @Roles() // Override class-level roles
  @ApiSecurity('sync-secret')
  @Get('credential/:provider')
  @ApiOperation({
    summary: 'External synchronization of credentials for another server.',
    description: `Allows a remote application to fetch raw credentials using a shared secret.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/integration-management/credential/OPENAI \\
    -H "X-Sync-Secret: your-shared-secret"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Credentials retrieved successfully.',
  })
  async fetchCredential(
    @Param('provider')
    provider: string,
    @Res() res: Response,
  ) {
    const normalizedProvider = provider.toUpperCase() as CredentialProvider;

    if (!Object.values(CredentialProvider).includes(normalizedProvider)) {
      throw new NotFoundException(`Invalid provider: ${provider}`);
    }

    const data =
      await this.integrationManagementService.getDecryptedCredential(
        normalizedProvider,
      );

    if (!data) {
      throw new NotFoundException(`Credentials not found for ${provider}`);
    }

    // Log the credential fetch event
    await this.integrationManagementService.recordUsage({
      provider: normalizedProvider,
      operation: 'CREDENTIAL_SYNC',
      metadata: {
        timestamp: new Date(),
        type: 'external_server_request',
      },
    });

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: `Credentials for ${normalizedProvider} retrieved successfully.`,
      data: {
        provider: normalizedProvider.toLowerCase(),
        ...data,
      },
    });
  }
}
