// src/module/analytics/analytics.controller.ts
import { Controller, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
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
    summary: 'Get advanced analytics dashboard data.',
    description: `Includes weekly stats, streak, CEFR skill progress, badges, and performance graphs.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/analytics/advanced \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Advanced analytics data retrieved successfully.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          weekly_stats: { xp: 350, lessons: 12 },
          streak: { current: 5, longest: 10 },
          skill_progress: { reading: 85, grammar: 40 },
        },
      },
    },
  })
  async getAdvancedAnalytics(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.id;

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
  @ApiOperation({
    summary: 'Get dashboard overview for free/pro users.',
    description: `Provides a snapshot of the user's current progress and available content.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/analytics/overview \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview data.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: { currentLevel: 'A1', completionPercentage: 45 },
      },
    },
  })
  async getOverviewDashboard(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.id;
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
  @ApiOperation({
    summary: 'Get practice dashboard data.',
    description: `Retrieves data for the practice mode, including recent mistakes and review items.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/analytics/practice \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Practice dashboard data.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: { itemsToReview: 5, masteryScore: 78 },
      },
    },
  })
  async getPracticeDashboard(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.id;
    const data = await this.analyticsService.getPracticeDashboard(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Practice dashboard loaded successfully',
      data,
    });
  }
}
