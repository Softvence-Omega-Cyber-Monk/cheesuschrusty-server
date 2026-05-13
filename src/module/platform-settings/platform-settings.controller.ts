import { Controller, Get, Put, Body, Res, HttpStatus } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import sendResponse from '../utils/sendResponse';
import { UpdatePlatformSettingsDto } from './dto/update-platform-setting.dto';

@ApiTags('Platform Settings')
@Controller('platform-settings')
export class PlatformSettingsController {
  constructor(private service: PlatformSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get global platform settings.',
    description: `Retrieves maintenance mode, versioning, and feature flags.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/platform-settings
    \`\`\``,
  })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully.' })
  async getSettings(@Res() res: Response) {
    const data = await this.service.getSettings();
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Platform settings fetched successfully',
      data,
    });
  }

  @Put()
  @ApiOperation({
    summary: 'Update global platform settings.',
    description: `Modify maintenance mode or version info.
    **Curl Example:**
    \`\`\`bash
    curl -X PUT http://localhost:5001/api/v1/platform-settings \\
    -H "Content-Type: application/json" \\
    -d '{"isMaintenanceMode": false, "version": "1.0.5"}'
    \`\`\``,
  })
  @ApiBody({ type: UpdatePlatformSettingsDto })
  @ApiResponse({ status: 200, description: 'Settings updated successfully.' })
  async updateSettings(
    @Body() dto: UpdatePlatformSettingsDto,
    @Res() res: Response,
  ) {
    const data = await this.service.updateSettings(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Platform settings updated successfully',
      data,
    });
  }
}
