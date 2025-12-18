// src/module/analytics/analytics.controller.ts
import { Controller, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import sendResponse from '../utils/sendResponse';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}


  @Get('advanced')
  @Roles(Role.USER)
  @ApiOperation({ 
    summary: 'Get advanced analytics dashboard data',
    description: 'Includes weekly stats, streak, CEFR skill progress, badges, recent sessions, and weekly performance graph'
  })
  @ApiResponse({ status: 200, description: 'Advanced analytics data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdvancedAnalytics(
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.id;

    const data = await this.analyticsService.getAdvancedAnalytics(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Advanced analytics loaded successfully',
      data,
    });
  }


  // In AnalyticsController
@Get('overview')
@Roles(Role.USER)
@ApiOperation({ summary: 'Get dashboard overview for free/pro users' })
async getOverviewDashboard(
  @Req() req: any,
  @Res() res: Response,
) {
  const userId = req.user.id;
  const data = await this.analyticsService.getOverviewDashboard(userId);

  return sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: 'Dashboard overview loaded successfully',
    data,
  });
}



@Get('practice')
@Roles(Role.USER)
@ApiOperation({ summary: 'Get practice dashboard data' })
async getPracticeDashboard(
  @Req() req: any,
  @Res() res: Response,
) {
  const userId = req.user.id;
  const data = await this.analyticsService.getPracticeDashboard(userId);

  return sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: 'Practice dashboard loaded successfully',
    data,
  });
}

  
}