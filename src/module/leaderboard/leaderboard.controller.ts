// src/module/leaderboard/leaderboard.controller.ts
import { Controller, Get, Query, Req, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { LeaderboardService } from './leaderboard.service';
import { ApiTags } from '@nestjs/swagger';
import sendResponse from '../utils/sendResponse';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('pro')
  @Roles(Role.USER)
  async getProLeaderboard(
    @Req() req: any,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'alltime' = 'alltime',
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