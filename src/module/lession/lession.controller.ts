// src/module/lesson/lesson.controller.ts

import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LessonType, Role, SkillArea } from '@prisma/client';
import { LessionService } from './lession.service';
import sendResponse from '../utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CompleteLessonDto } from './dto/complete-lesson.dto';
import { PracticeSessionService } from '../practice-session/practice-session.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';

@ApiTags('Lesson Practice (User)')
@Controller('lessons')
export class LessonController {
  constructor(
    private readonly lessonService: LessionService,
    private readonly practiceSessionService: PracticeSessionService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('grouped')
  @Roles(Role.USER)
  @ApiOperation({
    summary:
      'USER: Fetch grouped lesson data by level, skill, task, and domain with optional filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grouped lesson list retrieved.',
  })
  async findGroupedLessons(
    @Query() query: GetLessonsQueryDto,
    @Res() res: Response,
  ) {
    const lessonsData = await this.lessonService.findGroupedLessons(query);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Grouped lessons retrieved successfully.',
      data: lessonsData,
    });
  }

  @Get('next')
  @Roles(Role.USER)
  @ApiOperation({
    summary:
      'USER: Get the next unique or lowest-scored review lesson based on type and level.',
  })
  @ApiQuery({
    name: 'type',
    enum: LessonType,
    description: 'The type of lesson requested (e.g., READING).',
  })
  @ApiResponse({ status: 200, description: 'Returns the lesson content JSON.' })
  @ApiResponse({
    status: 404,
    description: 'No lessons available for this type/level.',
  })
  async findNextLesson(
    @Req() req: Request,
    @Res() res: Response,
    @Query('type') type: LessonType,
  ) {
    if (!type) {
      throw new BadRequestException(
        'Lesson type is required query parameters (e.g., ?type=READING&level=B1).',
      );
    }

    const userId = req.user!.id;

    const lesson = await this.lessonService.findNextLessonForUser(userId, type);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Next lesson retrieved successfully.',
      data: lesson,
    });
  }

  @Get('filter')
  @Roles(Role.USER)
  @ApiOperation({
    summary:
      'USER: Get the next lesson filtered by type, level, domain, and task ID.',
  })
  @ApiQuery({
    name: 'type',
    enum: LessonType,
    description: 'The type of lesson requested (e.g., READING).',
  })
  @ApiQuery({
    name: 'level',
    required: true,
    description:
      'The proficiency level (e.g., A1, A2, B1, B2, C1, C2). Uppercase and lowercase inputs are both supported.',
  })
  @ApiQuery({
    name: 'domain',
    required: false,
    description: 'Optional lesson domain filter (e.g., Business, Travel).',
  })
  @ApiQuery({
    name: 'task_id',
    required: false,
    description: 'Optional task ID filter (e.g., L-01).',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns the lesson content JSON filtered by type, level, and optional domain/task ID.',
  })
  @ApiResponse({ status: 400, description: 'Missing required parameters.' })
  @ApiResponse({
    status: 404,
    description: 'No lessons available for this type/level combination.',
  })
  async findLessonByTypeAndLevel(
    @Req() req: Request,
    @Res() res: Response,
    @Query('type') type: LessonType,
    @Query('level') level: string,
    @Query('domain') domain?: string,
    @Query('task_id') taskId?: string,
  ) {
    if (!type || !level) {
      throw new BadRequestException(
        'Both type and level are required query parameters (e.g., ?type=READING&level=B1&domain=Business&task_id=L-01).',
      );
    }

    const userId = req.user!.id;

    const lesson = await this.lessonService.findNextLessonByTypeAndLevel(
      userId,
      type,
      level,
      domain,
      taskId,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson retrieved successfully.',
      data: lesson,
    });
  }

  @Post(':id/complete')
  @Roles(Role.USER)
  async completeLesson(
    @Param('id') lessonId: number,
    @Body() dto: CompleteLessonDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = req.user!.id;

    const lesson = await this.lessonService.getSingleLesson(lessonId);
    if (!lesson) {
      return sendResponse(res, {
        statusCode: HttpStatus.NOT_FOUND,
        success: false,
        message: 'Lesson not found',
        data: null,
      });
    }

    const skillAreaMap: Record<string, SkillArea> = {
      READING: 'reading',
      LISTENING: 'listening',
      WRITING: 'writing',
      SPEAKING: 'speaking',
    };

    const skillArea = skillAreaMap[lesson.skill || 'READING'];

    await this.practiceSessionService.createSession({
      userId,
      skillArea,
      lessonId,
      accuracy: dto.accuracy,
      durationSeconds: dto.durationSeconds,
      xpEarned: dto.xpEarned,
    });

    await this.analyticsService.checkAndAwardBadges(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson completed successfully!',
      data: {
        xpEarned: dto.xpEarned,
        accuracy: dto.accuracy,
        skillImproved: skillArea,
        message: 'Great job! Your progress has been saved.',
      },
    });
  }
}
