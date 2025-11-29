// src/module/lesson/lesson.controller.ts

import { Controller, Get, Query, Req, Res, HttpStatus, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LessonType, Difficulty, Role } from '@prisma/client';
import { LessionService } from './lession.service';
import sendResponse from '../utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Lesson Practice (User)')
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessionService) {}



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

 
}