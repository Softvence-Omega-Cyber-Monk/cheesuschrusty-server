// src/module/lesson/dto/update-lesson-status.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean } from 'class-validator';

export class UpdateLessonStatusDto {
  @ApiProperty({
    description: 'The new publication status for the lesson.',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isPublished: boolean;
}