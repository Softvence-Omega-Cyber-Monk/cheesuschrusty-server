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
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateLessonBatchDto } from './dto/create-lesson-batch.dto';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';
import { LessionService } from './lession.service';
import sendResponse from '../utils/sendResponse';

@ApiTags('Lesson Batch Management (Super Admin, Content Manager)')
@Controller('admin/lessons/batch')
@Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
export class LessonBatchAdminController {
  constructor(private readonly lessonService: LessionService) {}

  private parseLessonId(lessonId: string): number {
    const id = parseInt(lessonId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Lesson ID must be a valid number.');
    }
    return id;
  }

  @Post()
  @ApiOperation({ summary: 'Create the lesson batch container' })
  @ApiBody({ type: CreateLessonBatchDto })
  @ApiResponse({ status: 201, description: 'Lesson batch created successfully.' })
  async createLessonBatch(
    @Body() dto: CreateLessonBatchDto,
    @Res() res: Response,
  ) {
    const newLessonBatch = await this.lessonService.createLessonBatch(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Lesson batch created and published successfully.',
      data: this.lessonService.toBatchAdminLessonResponse(newLessonBatch),
    });
  }

  @Get()
  @ApiOperation({
    summary:
      'Fetch all lesson batches with search, filter (type, level), and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of lesson batches retrieved.',
  })
  async findAllLessonBatches(
    @Query() query: GetLessonsQueryDto,
    @Res() res: Response,
  ) {
    const lessonsData = await this.lessonService.findAllLessons(query);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson batches retrieved successfully.',
      data: this.lessonService.toBatchAdminLessonListResponse(lessonsData),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details of a single lesson batch by ID.' })
  @ApiParam({ name: 'id', description: 'Lesson ID (integer)', type: 'number' })
  @ApiResponse({ status: 200, description: 'Lesson batch details retrieved.' })
  @ApiResponse({ status: 404, description: 'Lesson batch not found.' })
  async getSingleLessonBatch(
    @Param('id') lessonId: string,
    @Res() res: Response,
  ) {
    const id = this.parseLessonId(lessonId);
    const lesson = await this.lessonService.getSingleLesson(id);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson batch details retrieved successfully.',
      data: this.lessonService.toBatchAdminLessonResponse(lesson),
    });
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update the publication status (isPublished) of a lesson batch.',
  })
  @ApiParam({ name: 'id', description: 'Lesson ID (integer)', type: 'number' })
  @ApiBody({ type: UpdateLessonStatusDto })
  @ApiResponse({ status: 200, description: 'Lesson batch status updated.' })
  @ApiResponse({ status: 404, description: 'Lesson batch not found.' })
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
      message: 'Lesson batch status updated successfully.',
      data: this.lessonService.toBatchAdminLessonResponse(updatedLesson),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a lesson batch and all related user progress.',
  })
  @ApiParam({ name: 'id', description: 'Lesson ID (integer)', type: 'number' })
  @ApiResponse({
    status: 204,
    description: 'Lesson batch deleted successfully (No Content).',
  })
  @ApiResponse({ status: 404, description: 'Lesson batch not found.' })
  async deleteLessonBatch(
    @Param('id') lessonId: string,
    @Res() res: Response,
  ) {
    const id = this.parseLessonId(lessonId);

    await this.lessonService.deleteLesson(id);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Lesson batch deleted successfully.',
      data: null,
    });
  }
}
