// src/module/leaderboard/leaderboard.controller.ts
import { Controller, Get, Query, Req, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { LeaderboardService } from './leaderboard.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import sendResponse from '../utils/sendResponse';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('pro')
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Get the global leaderboard rankings.',
    description: `Retrieves top users by XP for the specified period.
    **Curl Example:**
    \`\`\`bash
    curl -X GET "http://localhost:5001/api/v1/leaderboard/pro?period=weekly" \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          rankings: [{ rank: 1, name: 'Luigi', xp: 1200 }],
          userRank: { rank: 45, xp: 350 }
        }
      }
    }
  })
  async getProLeaderboard(
    @Req() req: any,
    @Query('period')
    period: 'daily' | 'weekly' | 'monthly' | 'alltime' = 'alltime',
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const data = await this.leaderboardService.getLeaderboard(userId, period);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Pro Leaderboard loaded successfully',
      data,
    });
  }
}
