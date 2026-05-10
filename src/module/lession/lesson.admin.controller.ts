// src/module/lesson/lesson.admin.controller.ts

import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Patch,
  Param,
  Get,
  Query,
  Delete,
  HttpCode,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';
import { LessionService } from './lession.service';
import sendResponse from '../utils/sendResponse';
import { CreateLessonContainerDto } from './dto/create-lesson.dto';

@ApiTags('Lesson Content Management (Super Admin, Content Manager)')
@Controller('admin/lessons')
@Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
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
  @ApiOperation({ 
    summary: 'Create a new lesson metadata container.',
    description: `Initializes a lesson shell with difficulty, skill, and topic. This shell must be created before generating AI content.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/admin/lessons \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{
      "LESSON_TITLE": "Advanced Italian Grammar",
      "topic": "Subjunctive Mood",
      "SKILL": "GRAMMAR",
      "LEVEL_ID": "C1",
      "GENERATION_SEED": "Focus on high-level academic conversation."
    }'
    \`\`\``
  })
  @ApiBody({ type: CreateLessonContainerDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Lesson created successfully.',
    schema: {
      example: {
        statusCode: 201,
        success: true,
        message: 'Lesson created and published successfully.',
        data: {
          id: 105,
          LESSON_TITLE: 'Advanced Italian Grammar',
          topic: 'Subjunctive Mood',
          isPublished: false,
          generation_seed: 'Focus on high-level academic conversation.'
        }
      }
    }
  })
  async createLesson(
    @Body() dto: CreateLessonContainerDto,
    @Res() res: Response,
  ) {
    const newLesson = await this.lessonService.createLessonContainer(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Lesson created and published successfully.',
      data: this.lessonService.toAdminLessonResponse(newLesson),
    });
  }

  // --- 2. READ ALL (GET /admin/lessons) ---
  @Get()
  @ApiOperation({
    summary:
      ' Fetch all lessons with search, filter (type, level), and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of lessons retrieved.',
  })
  async findAllLessons(
    @Query() query: GetLessonsQueryDto,
    @Res() res: Response,
  ) {
    const lessonsData = await this.lessonService.findAllLessons(query);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lessons retrieved successfully.',
      data: this.lessonService.toAdminLessonListResponse(lessonsData),
    });
  }

  @Get('grouped')
  @ApiOperation({
    summary: 'Fetch grouped lesson data by level, skill, task, and domain.',
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

  // --- 3. READ SINGLE (GET /admin/lessons/:id) ---
  @Get(':id')
  @ApiOperation({ 
    summary: 'Get full details of a single lesson by ID.',
    description: `Retrieves the full lesson metadata and associated question sets.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/admin/lessons/105 \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``
  })
  @ApiParam({ name: 'id', description: 'Lesson ID (integer)', type: 'number' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lesson details retrieved.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          id: 105,
          LESSON_TITLE: 'Advanced Italian Grammar',
          SKILL: 'GRAMMAR',
          isPublished: false
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Lesson not found.' })
  async getSingleLesson(@Param('id') lessonId: string, @Res() res: Response) {
    const id = this.parseLessonId(lessonId);

    const lesson = await this.lessonService.getSingleLesson(id);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson details retrieved successfully.',
      data: this.lessonService.toAdminLessonResponse(lesson),
    });
  }

  // --- 4. UPDATE STATUS (PATCH /admin/lessons/:id/status) ---
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update lesson publication status.',
    description: `Toggles whether a lesson is visible to students.
    **Curl Example:**
    \`\`\`bash
    curl -X PATCH http://localhost:5001/api/v1/admin/lessons/105/status \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"isPublished": true}'
    \`\`\``
  })
  @ApiParam({ name: 'id', description: 'Lesson ID (integer)', type: 'number' })
  @ApiBody({ type: UpdateLessonStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  @ApiResponse({ status: 200, description: 'Lesson status updated.' })
  @ApiResponse({ status: 404, description: 'Lesson not found.' })
  async updateStatus(
    @Param('id') lessonId: string,
    @Body() dto: UpdateLessonStatusDto,
    @Res() res: Response,
  ) {
    const id = this.parseLessonId(lessonId);

    const updatedLesson = await this.lessonService.updatePublishedStatus(
      id,
      dto,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson status updated successfully.',
      data: this.lessonService.toAdminLessonResponse(updatedLesson),
    });
  }

  // --- 5. DELETE (DELETE /admin/lessons/:id) ---
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete a lesson.',
    description: `Permanently removes a lesson and associated question sets.
    **Curl Example:**
    \`\`\`bash
    curl -X DELETE http://localhost:5001/api/v1/admin/lessons/105 \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``
  })
  @ApiParam({ name: 'id', description: 'Lesson ID (integer)', type: 'number' })
  @ApiResponse({ status: 204, description: 'Lesson deleted.' })
  @ApiResponse({ status: 404, description: 'Lesson not found.' })
  async deleteLesson(@Param('id') lessonId: string, @Res() res: Response) {
    const id = this.parseLessonId(lessonId);

    await this.lessonService.deleteLesson(id);

    // Using sendResponse for consistency, even with 204 status.
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson deleted successfully.',
      data: null,
    });
  }
}
