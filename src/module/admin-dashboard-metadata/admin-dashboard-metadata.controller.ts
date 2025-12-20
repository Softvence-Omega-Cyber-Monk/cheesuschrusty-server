// src/module/admin/admin.controller.ts
import { Controller, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminDashboardMetadataService } from './admin-dashboard-metadata.service';
import sendResponse from '../utils/sendResponse';


@ApiTags('Admin Dashboard')
@Controller('admin/dashboard') 
export class AdminDashboardMetadataController {
  constructor(
    private readonly adminDashboardMetadataService: AdminDashboardMetadataService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.SUPORT_MANAGER)
  @ApiOperation({ 
    summary: 'Get admin dashboard metadata',
    description: 'Returns key metrics, user growth, recent activity, and subscription breakdown'
  })
  @ApiResponse({ status: 200, description: 'Admin dashboard data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  async getDashboard(
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.adminDashboardMetadataService.getDashboardData();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Admin dashboard data loaded successfully',
      data,
    });
  }


  @Get('analytics')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.SUPORT_MANAGER)
  @ApiOperation({ 
    summary: 'Get admin analytics dashboard data',
    description: 'Returns real-time analytics: active users, study time, content completion, retention, charts, and insights'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Analytics data retrieved successfully' 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  async getAnalytics(
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.adminDashboardMetadataService.getAnalyticsData();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Admin analytics data loaded successfully',
      data,
    });
  }



}