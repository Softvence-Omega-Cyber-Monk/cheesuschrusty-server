import { Controller, Get, Put, Body, Res, HttpStatus } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { Response } from 'express';
import sendResponse from '../utils/sendResponse';
import { UpdatePlatformSettingsDto } from './dto/update-platform-setting.dto';


@Controller('platform-settings')
export class PlatformSettingsController {
  constructor(private service: PlatformSettingsService) {}

  @Get()
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
