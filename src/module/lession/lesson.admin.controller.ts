// src/module/lesson/lesson.admin.controller.ts

import { 
  Controller, Post, Body, Res, HttpStatus, Patch, Param, Get, Query, Delete, HttpCode, BadRequestException, UsePipes
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator'; 
import { Role } from '@prisma/client';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';
import { LessionService } from './lession.service';
import sendResponse from '../utils/sendResponse';
import { CreateLessonContainerDto } from './dto/create-lesson.dto';

@ApiTags('Lesson Content Management (Super Admin, Content Manager)')
@Controller('admin/lessons')
@Roles(Role.SUPER_ADMIN,Role.CONTENT_MANAGER)
export class LessonAdminController {
  constructor(private readonly lessonService: LessionService) {}
  
  // Helper to ensure Lesson ID is a valid number
  private parseLessonId(lessonId: string): number {
    const id = parseInt(lessonId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Lesson ID must be a valid number.');
    }
    return id;
  }

  // --- 1. CREATE (POST /admin/lessons) ---
  @Post()
  @ApiOperation({ summary: ' Create the lession container' })
  @ApiBody({ type: CreateLessonContainerDto })
  @ApiResponse({ status: 201, description: 'Lesson created successfully.' })
  async createLesson(@Body() dto: CreateLessonContainerDto, @Res() res: Response) {
    const newLesson = await this.lessonService.createLessonContainer(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Lesson created and published successfully.',
      data: newLesson,
    });
  }

  // --- 2. READ ALL (GET /admin/lessons) ---
  @Get()
  @ApiOperation({ summary: ' Fetch all lessons with search, filter (type, level), and pagination.' })
  @ApiResponse({ status: 200, description: 'Paginated list of lessons retrieved.' })
  async findAllLessons(@Query() query: GetLessonsQueryDto, @Res() res: Response) {
    const lessonsData = await this.lessonService.findAllLessons(query);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lessons retrieved successfully.',
      data: lessonsData,
    });
  }

  // --- 3. READ SINGLE (GET /admin/lessons/:id) ---
  @Get(':id')
  @ApiOperation({ summary: ' Get full details of a single lesson by ID.' })
  @ApiParam({ name: 'id', description: 'Lesson ID (integer)', type: 'number' })
  @ApiResponse({ status: 200, description: 'Lesson details retrieved.' })
  @ApiResponse({ status: 404, description: 'Lesson not found.' })
  async getSingleLesson(@Param('id') lessonId: string, @Res() res: Response) {
    const id = this.parseLessonId(lessonId);

    const lesson = await this.lessonService.getSingleLesson(id);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson details retrieved successfully.',
      data: lesson,
    });
  }

  // --- 4. UPDATE STATUS (PATCH /admin/lessons/:id/status) ---
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update the publication status (isPublished) of a lesson.' })
  @ApiParam({ name: 'id', description: 'Lesson ID (integer)', type: 'number' })
  @ApiBody({ type: UpdateLessonStatusDto })
  @ApiResponse({ status: 200, description: 'Lesson status updated.' })
  @ApiResponse({ status: 404, description: 'Lesson not found.' })
  async updateStatus(
    @Param('id') lessonId: string,
    @Body() dto: UpdateLessonStatusDto,
    @Res() res: Response,
  ) {
    const id = this.parseLessonId(lessonId);

    const updatedLesson = await this.lessonService.updatePublishedStatus(id, dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson status updated successfully.',
      data: updatedLesson,
    });
  }

  // --- 5. DELETE (DELETE /admin/lessons/:id) ---
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: ' Delete a lesson and all related user progress.' })
  @ApiParam({ name: 'id', description: 'Lesson ID (integer)', type: 'number' })
  @ApiResponse({ status: 204, description: 'Lesson deleted successfully (No Content).' })
  @ApiResponse({ status: 404, description: 'Lesson not found.' })
  async deleteLesson(@Param('id') lessonId: string, @Res() res: Response) {
    const id = this.parseLessonId(lessonId);

    await this.lessonService.deleteLesson(id);

    // Using sendResponse for consistency, even with 204 status.
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson deleted successfully.',
      data:null,
    });
  }
}