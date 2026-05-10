import {
  Controller,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
  HttpStatus,
  Res,
  ParseEnumPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CredentialProvider } from '@prisma/client';
import { IntegrationManagementService } from './integration-management.service';
import { AIBridgeGuard } from './ai-bridge.guard';
import { Public } from '../../common/decorators/public.decorators';
import sendResponse from '../utils/sendResponse';

@ApiTags('AI Bridge')
@Controller('ai-bridge')
export class AIBridgeController {
  private readonly allowedProviders = [
    CredentialProvider.OPENAI,
    (CredentialProvider as any).GEMINI,
    CredentialProvider.GROK,
  ] as CredentialProvider[];

  constructor(
    private readonly integrationManagementService: IntegrationManagementService,
  ) {}

  @Public() // Bypasses the global JWT guard
  @UseGuards(AIBridgeGuard)
  @Get('credentials/:provider')
  @ApiOperation({
    summary: 'Runtime endpoint for external AI server to fetch specific keys.',
    description: `Securely retrieve a specific AI provider key. Requires the x-ai-bridge-secret header.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/ai-bridge/credentials/OPENAI \\
    -H "x-ai-bridge-secret: YOUR_BRIDGE_SECRET"
    \`\`\``,
  })
  @ApiHeader({
    name: 'x-ai-bridge-secret',
    required: true,
    description: 'Shared secret for inter-server authentication',
  })
  @ApiResponse({
    status: 200,
    description: 'Credentials retrieved successfully.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: 'Credentials for OPENAI retrieved successfully.',
        data: {
          api_key: 'sk-proj-****abcd'
        }
      }
    }
  })
  async getCredentials(
    @Param('provider', new ParseEnumPipe(CredentialProvider))
    provider: CredentialProvider,
    @Res() res: Response,
  ) {
    // Strict filtering: Only allow AI providers
    if (!this.allowedProviders.includes(provider)) {
      throw new ForbiddenException(
        `Access denied. The AI bridge is restricted to AI providers only.`,
      );
    }

    const data = await this.integrationManagementService.getDecryptedCredential(
      provider,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: `Credentials for ${provider} retrieved successfully.`,
      data,
    });
  }
}