import { Body, Controller, Delete, Get, HttpStatus, Patch, Post, Req, Res } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import sendResponse from '../utils/sendResponse';
import { Request, Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('User Settings')
@ApiBearerAuth()
@Controller('user-settings')
export class UserSettingsController {
  constructor(private userSettingsService: UserSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user settings' })
  async getUserSettings(@Req() req: Request, @Res() res: Response) {
    const settings = await this.userSettingsService.getUserSettings(req.user!.id);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Settings retrieved successfully',
      data: settings,
    });
  }

  @Patch()
  @ApiOperation({ summary: 'Update user settings' })
  async updateUserSettings(
    @Body() dto: UpdateUserSettingsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const settings = await this.userSettingsService.updateUserSettings(req.user!.id, dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset settings to default values' })
  async resetSettings(@Req() req: Request, @Res() res: Response) {
    const settings = await this.userSettingsService.resetToDefaults(req.user!.id);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Settings reset to defaults',
      data: settings,
    });
  }

  @Delete()
  @ApiOperation({ summary: 'Delete user settings' })
  async deleteSettings(@Req() req: Request, @Res() res: Response) {
    const result = await this.userSettingsService.deleteUserSettings(req.user!.id);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: null,
    });
  }
}