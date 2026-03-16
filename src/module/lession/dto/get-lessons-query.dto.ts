// src/module/lesson/dto/get-lessons-query.dto.ts

import { IsOptional, IsInt, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { LessonType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

const lessonTypes = Object.values(LessonType);

export class GetLessonsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination (starts at 1).',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page.',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search term applied to the lesson task_id',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter lessons by type.',
    enum: lessonTypes,
  })
  @IsOptional()
  @IsString()
  @IsIn(lessonTypes)
  type?: LessonType;

  @ApiPropertyOptional({
    description:
      'Filter lessons by level (e.g., A1, A2, B1, B2, C1, C2). Uppercase and lowercase inputs are both supported.',
    example: 'B1',
  })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({
    description: 'Filter lessons by domain.',
    example: 'Business',
  })
  @IsOptional()
  @IsString()
  domain?: string;
}
