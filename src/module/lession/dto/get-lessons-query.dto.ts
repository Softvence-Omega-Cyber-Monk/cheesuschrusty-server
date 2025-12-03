// src/module/lesson/dto/get-lessons-query.dto.ts

import { IsOptional, IsInt, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { LessonType, Difficulty } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

const lessonTypes = Object.values(LessonType);
const difficultyLevels = Object.values(Difficulty);

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
    description: 'Search term applied to the lesson title',
  })
  @IsOptional()
  @IsString()
  search?: string; // Searches the 'prompt' field

  @ApiPropertyOptional({
    description: 'Filter lessons by type.',
    enum: lessonTypes,
  })
  @IsOptional()
  @IsString()
  @IsIn(lessonTypes)
  type?: LessonType;

  @ApiPropertyOptional({
    description: 'Filter lessons by difficulty level.',
    enum: difficultyLevels,
  })
  @IsOptional()
  @IsString()
  @IsIn(difficultyLevels)
  level?: Difficulty;
}