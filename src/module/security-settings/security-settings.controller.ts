// src/module/security-settings/security-settings.controller.ts
import { Controller, Get, Patch, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { SecuritySettingsService } from './security-settings.service';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto';
import sendResponse from 'src/module/utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Security Settings')
@Controller('settings/security')
export class SecuritySettingsController {
  constructor(private readonly securityService: SecuritySettingsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Retrieve current security settings.',
    description: `Returns settings like password complexity, 2FA requirements, and session timeouts.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/settings/security \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Security settings retrieved.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: { passwordMinLength: 8, mfaEnabled: true },
      },
    },
  })
  async getSettings(@Res() res: Response) {
    const settings = await this.securityService.getSettings();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Security settings retrieved successfully.',
      data: settings,
    });
  }

  @Patch()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update security settings.',
    description: `Modify password policies or session settings.
    **Curl Example:**
    \`\`\`bash
    curl -X PATCH http://localhost:5001/api/v1/settings/security \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"passwordMinLength": 10}'
    \`\`\``,
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateSecuritySettingsDto })
  @ApiResponse({ status: 200, description: 'Security settings updated.' })
  async updateSettings(
    @Body() dto: UpdateSecuritySettingsDto,
    @Res() res: Response,
  ) {
    const updated = await this.securityService.updateSettings(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Security settings updated successfully.',
      data: updated,
    });
  }
}
