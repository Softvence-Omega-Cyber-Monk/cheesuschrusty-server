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
} from '@nestjs/common';
import { CredentialProvider, Role } from '@prisma/client';
import { Response } from 'express';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import sendResponse from '../utils/sendResponse';
import { RecordIntegrationUsageDto } from './dto/record-integration-usage.dto';
import { UpsertIntegrationCredentialDto } from './dto/upsert-integration-credential.dto';
import { IntegrationManagementService } from './integration-management.service';

@ApiTags('Integration Management')
@Controller('integration-management')
@Roles(Role.SUPER_ADMIN)
export class IntegrationManagementController {
  constructor(
    private readonly integrationManagementService: IntegrationManagementService,
  ) {}

  @Get('credentials')
  @ApiOperation({
    summary:
      'Get masked credential metadata for OpenAI, Grok, LemonSqueezy, and Cloudinary.',
  })
  async getCredentials(@Res() res: Response) {
    const data = await this.integrationManagementService.listCredentials();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Integration credentials retrieved successfully.',
      data,
    });
  }

  @Put('credentials/:provider')
  @ApiOperation({
    summary: 'Create or rotate encrypted credentials for a provider.',
  })
  @ApiBody({ type: UpsertIntegrationCredentialDto })
  async upsertCredential(
    @Param('provider', new ParseEnumPipe(CredentialProvider))
    provider: CredentialProvider,
    @Body() dto: UpsertIntegrationCredentialDto,
    @Res() res: Response,
  ) {
    const data = await this.integrationManagementService.upsertCredential(
      provider,
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
    summary:
      'Record a usage stat for OpenAI, Grok, LemonSqueezy, or Cloudinary.',
  })
  @ApiBody({ type: RecordIntegrationUsageDto })
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
  @ApiOperation({ summary: 'Get usage stat records.' })
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
  @ApiOperation({ summary: 'Get aggregated usage stats.' })
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
}
