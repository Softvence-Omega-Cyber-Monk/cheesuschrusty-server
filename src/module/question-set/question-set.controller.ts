// src/module/question-set/question-set.controller.ts
import { 
  Controller, Post, Body, Res, HttpStatus, Get, Param, BadRequestException 
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

import sendResponse from '../utils/sendResponse';
import { QuestionSetService } from './question-set.service';
import { CreateQuestionSetDto } from './dto/question-set.dto';

@ApiTags('Lesson QuestionSet Management')
@Controller('questionset')
export class QuestionSetController {
  constructor(private readonly questionSetService: QuestionSetService) {}

  // Helper to ensure Lesson ID is a valid number
  private parseLessonId(lessonId: string): number {
    const id = parseInt(lessonId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Lesson ID must be a valid number.');
    }
    return id;
  }

  // ----------------------------------------------
  // 1. SAVE / UPDATE QuestionSet
  // ----------------------------------------------
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @ApiOperation({
    summary: 'Save or update a QuestionSet for a lesson.',
    description: 'This endpoint stores AI-generated content for a lesson.',
  })
  @ApiBody({ type: CreateQuestionSetDto })
  @ApiResponse({ status: 201, description: 'QuestionSet saved/updated successfully.' })
  async createOrUpdateQuestionSet(
    @Body() dto: CreateQuestionSetDto,
    @Res() res: Response,
  ) {
    const questionSet = await this.questionSetService.createQuestionSet(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'QuestionSet saved successfully.',
      data: questionSet,
    });
  }

  // ----------------------------------------------------
  // 2. GET QuestionSet by Lesson ID
  // ----------------------------------------------------
  @Get(':lessonId')
  @Roles(Role.USER, Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @ApiOperation({
    summary: 'Get the QuestionSet for a lesson by lesson ID.',
    description: 'Returns the structured content for the lesson.',
  })
  @ApiParam({ name: 'lessonId', type: 'number', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'QuestionSet retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'QuestionSet not found.' })
  async getQuestionSet(
    @Param('lessonId') lessonId: string,
    @Res() res: Response,
  ) {
    const id = this.parseLessonId(lessonId);

    const questionSet = await this.questionSetService.getQuestionSetByLessonId(id);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'QuestionSet retrieved successfully.',
      data: questionSet,
    });
  }
}