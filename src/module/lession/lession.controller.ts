// src/module/lesson/lesson.controller.ts

import { Controller, Get, Query, Req, Res, HttpStatus, BadRequestException, Post, Param, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LessonType, Role, SkillArea } from '@prisma/client';
import { LessionService } from './lession.service';
import sendResponse from '../utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CompleteLessonDto } from './dto/complete-lesson.dto';
import { PracticeSessionService } from '../practice-session/practice-session.service';

@ApiTags('Lesson Practice (User)')
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessionService,
    private readonly practiceSessionService: PracticeSessionService,
  ) {}



  @Get('next')
  @Roles(Role.USER) 
  @ApiOperation({ summary: 'USER: Get the next unique or lowest-scored review lesson based on type and level.' })
  @ApiQuery({ name: 'type', enum: LessonType, description: 'The type of lesson requested (e.g., READING).' })
  @ApiResponse({ status: 200, description: 'Returns the lesson content JSON.' })
  @ApiResponse({ status: 404, description: 'No lessons available for this type/level.' })
  async findNextLesson(
    @Req() req: Request,
    @Res() res: Response,
    @Query('type') type: LessonType
  ) {
    // 1. Explicit input validation using NestJS Exceptions (fixes the previous error)
    if (!type) {
      throw new BadRequestException('Lesson type is required query parameters (e.g., ?type=READING&level=B1).');
    }
    
    // 2. userId is guaranteed to exist by the authentication guard
    const userId = req.user!.id; 

    const lesson = await this.lessonService.findNextLessonForUser(
      userId,
      type
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Next lesson retrieved successfully.',
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

    // 1. Get lesson to determine skillArea
    const lesson = await this.lessonService.getSingleLesson(lessonId);
    if (!lesson) {
      return sendResponse(res, {
        statusCode: HttpStatus.NOT_FOUND,
        success: false,
        message: 'Lesson not found',
        data:null
      });
    }

    // Map LessonType → SkillArea
    const skillAreaMap: Record<string, SkillArea> = {
      READING: 'reading',
      LISTENING: 'listening',
      WRITING: 'writing',
      SPEAKING: 'speaking',
    };

    const skillArea = skillAreaMap[lesson.type] as SkillArea;

    // 2. Save via PracticeSessionService
    await this.practiceSessionService.createSession({
      userId,
      skillArea,
      lessonId,
      accuracy: dto.accuracy,
      durationSeconds: dto.durationSeconds,
      xpEarned: dto.xpEarned,
    });

    // 3. Return success + feedback
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