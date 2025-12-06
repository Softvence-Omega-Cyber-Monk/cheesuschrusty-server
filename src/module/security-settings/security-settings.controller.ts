// src/module/security-settings/security-settings.controller.ts
import { Controller, Get, Patch, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiConsumes } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Retrieve current security settings.' })
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
  @ApiOperation({ summary: 'Update security settings.' })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateSecuritySettingsDto })
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
