// src/module/lesson/dto/complete-lesson.dto.ts
import { IsNumber, IsInt, IsPositive, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteLessonDto {
  @ApiProperty({
    description: 'Total time spent on the lesson in seconds (from frontend timer)',
    example: 480,
  })
  @IsInt()
  @IsPositive()
  durationSeconds: number;

  @ApiProperty({
    description: 'The accuracy percentage returned by AI (score_percentage)',
    example: 75.5,
  })
  @IsNumber()
  @Min(0)
  @IsPositive()
  accuracy: number;

  @ApiProperty({
    description: 'XP points awarded by AI (xp_point)',
    example: 20,
  })
  @IsInt()
  @IsPositive()
  xpEarned: number;


}