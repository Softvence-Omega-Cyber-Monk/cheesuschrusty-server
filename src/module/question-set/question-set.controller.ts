// src/module/question-set/question-set.admin.controller.ts
import { 
  Controller, Post, Body, Res, HttpStatus, Get, Param, Query, BadRequestException 
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role, SubCategoryType } from '@prisma/client';

import sendResponse from '../utils/sendResponse';
import { QuestionSetService } from './question-set.service';
import { CreateQuestionSetDto } from './dto/question-set.dto';

@ApiTags('Lesson QuestionSet Management (Super Admin, Content Manager, User)')
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
  // 1. SAVE / UPDATE QuestionSet (AI Content Step 2)
  // ----------------------------------------------
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @ApiOperation({
    summary: 'Save or regenerate (upsert) a QuestionSet for a lesson.',
    description:
      'This endpoint stores AI-generated activity content for a specific SubCategoryType of a lesson.',
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
  // 2. GET Single QuestionSet by Lesson ID + SubCategory
  // ----------------------------------------------------
  @Get(':lessonId')
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Get a specific QuestionSet for a lesson.',
    description: 'Returns the structured activity content for the selected SubCategoryType.',
  })
  @ApiParam({ name: 'lessonId', type: 'number', description: 'Parent Lesson ID' })
  @ApiQuery({
    name: 'subCategoryType',
    enum: SubCategoryType,
    description: 'The activity type to retrieve (e.g., DICTATION_EXERCISE)',
  })
  @ApiResponse({ status: 200, description: 'QuestionSet retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'QuestionSet not found.' })
  async getQuestionSet(
    @Param('lessonId') lessonId: string,
    @Query('subCategoryType') subCategoryType: SubCategoryType,
    @Res() res: Response,
  ) {
    const id = this.parseLessonId(lessonId);

    const questionSet =
      await this.questionSetService.getQuestionSetBySubCategory(id, subCategoryType);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'QuestionSet retrieved successfully.',
      data: questionSet,
    });
  }
}
