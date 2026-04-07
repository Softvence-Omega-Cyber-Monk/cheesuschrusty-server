// src/module/analytics/analytics.controller.ts
import { Controller, Get, Req, Res, HttpStatus, Query } from '@nestjs/common';
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
    description:
      'Includes weekly stats, streak, CEFR skill progress, badges, recent sessions, and weekly performance graph',
  })
  @ApiResponse({
    status: 200,
    description: 'Advanced analytics data retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdvancedAnalytics(@Req() req: any, @Res() res: Response) {
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
  async getOverviewDashboard(@Req() req: any, @Res() res: Response) {
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
  async getPracticeDashboard(@Req() req: any, @Res() res: Response) {
    const userId = req.user.id;
    const data = await this.analyticsService.getPracticeDashboard(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Practice dashboard loaded successfully',
      data,
    });
  }

  @Get('revenue/mrr')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get Monthly Recurring Revenue (MRR) analytics',
    description: 'Returns MRR, growth rate, quick ratio, and breakdown for admins',
  })
  async getMRRAnalytics(
    @Query('range') range: string = '30d/1m',
    @Res() res: Response,
  ) {
    const data = await this.analyticsService.getMRRAnalytics(range);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Revenue analytics loaded successfully',
      data,
    });
  }

  @Get('revenue/churn')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get Churn Analysis',
    description:
      'Returns monthly churn rate trend, top churn reasons, at-risk users, and LTV estimate',
  })
  @ApiResponse({
    status: 200,
    description: 'Churn analytics data retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin only)' })
  async getChurnAnalytics(
    @Query('range') range: string = '30d/1m',
    @Res() res: Response,
  ) {
    const data = await this.analyticsService.getChurnAnalytics(range);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Churn analytics loaded successfully',
      data,
    });
  }

  @Get('cohort-retention')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get Cohort Retention Analysis',
    description: 'Returns monthly cohort based retention data and insights',
  })
  @ApiResponse({
    status: 200,
    description: 'Cohort retention analytics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin only)' })
  async getRetentionAnalytics(@Res() res: Response) {
    const data = await this.analyticsService.getRetentionInsights();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Retention analytics loaded successfully',
      data,
    });
  }

  @Get('user-engagement')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get User Engagement Analytics',
    description:
      'Returns DAU, WAU, MAU, stickiness, feature usage, and session stats',
  })
  @ApiResponse({
    status: 200,
    description: 'User engagement analytics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin only)' })
  async getEngagementAnalytics(@Res() res: Response) {
    const data = await this.analyticsService.getEngagementDashboard();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Engagement analytics loaded successfully',
      data,
    });
  }

  @Get('top-perform')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get Top Performing Content Analytics',
    description:
      'Returns top lessons, skill breakdown, and performance by difficulty',
  })
  @ApiResponse({
    status: 200,
    description: 'Content performance analytics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin only)' })
  async getContentAnalytics(@Res() res: Response) {
    const data = await this.analyticsService.getContentAnalytics();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Content analytics loaded successfully',
      data,
    });
  }

  @Get('customer-acquisition')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get Customer Acquisition Analytics',
    description:
      'Returns CAC, LTV/CAC ratio, payback periods, and channel attribution',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer acquisition analytics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin only)' })
  async getAcquisitionAnalytics(@Res() res: Response) {
    const data = await this.analyticsService.getCustomerAcquisitionMetrics();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Acquisition analytics loaded successfully',
      data,
    });
  }
}
