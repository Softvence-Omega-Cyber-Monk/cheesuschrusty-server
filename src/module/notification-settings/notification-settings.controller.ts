import { Controller, Get, Put, Body, Res, HttpStatus } from '@nestjs/common';
import { NotificationSettingsService } from './notification-settings.service';
import { Response } from 'express';
import sendResponse from '../utils/sendResponse';
import { UpdateNotificationSettingsDto } from './update-notification-settings.dto';

@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(private service: NotificationSettingsService) {}

  @Get()
  async getSettings(@Res() res: Response) {
    const data = await this.service.getSettings();
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Notification settings fetched successfully',
      data,
    });
  }

  @Put()
  async updateSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @Res() res: Response,
  ) {
    const data = await this.service.updateSettings(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Notification settings updated successfully',
      data,
    });
  }
}
