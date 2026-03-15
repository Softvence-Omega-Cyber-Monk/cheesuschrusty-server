import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { CreateLessonContainerDto } from './create-lesson.dto';

export class CreateLessonBatchDto extends CreateLessonContainerDto {
  @ApiProperty({
    description: 'Number of variants to create in the batch.',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  variant_count: number;
}
