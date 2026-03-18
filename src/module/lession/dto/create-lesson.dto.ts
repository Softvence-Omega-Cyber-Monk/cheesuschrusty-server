import { IsString, IsNotEmpty, IsIn, IsInt } from 'class-validator';
import { LessonType, AIProvider } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

const lessonTypes = Object.values(LessonType);
const aiProviders = Object.values(AIProvider);

export class CreateLessonContainerDto {
  @ApiProperty({
    description: 'The AI provider used for the lesson.',
    enum: aiProviders,
    example: AIProvider.OPENAI,
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(aiProviders)
  provider: AIProvider;

  @ApiProperty({
    description: 'Level identifier for the lesson.',
    example: 'A1',
  })
  @IsNotEmpty()
  @IsString()
  LEVEL_ID: string;

  @ApiProperty({
    description: 'Target language for the lesson.',
    example: 'Italian',
  })
  @IsNotEmpty()
  @IsString()
  TARGET_LANGUAGE: string;

  @ApiProperty({
    description: 'Lesson skill type.',
    enum: lessonTypes,
    example: LessonType.GRAMMAR,
  })
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsIn(lessonTypes)
  SKILL: LessonType;

  @ApiProperty({
    description: 'Task identifier.',
    example: 'L-01',
  })
  @IsNotEmpty()
  @IsString()
  TASK_ID: string;

  @ApiProperty({
    description: 'Lesson domain.',
    example: 'Auto',
  })
  @IsNotEmpty()
  @IsString()
  DOMAIN: string;

  @ApiProperty({
    description: 'Difficulty label.',
    example: 'Beginner',
  })
  @IsNotEmpty()
  @IsString()
  DIFFICULTY: string;

  @ApiProperty({
    description: 'Total number of sections in the lesson.',
    example: 3,
  })
  @Type(() => Number)
  @IsInt()
  SECTION_TOTAL: number;

  @ApiProperty({
    description: 'Estimated task time in minutes.',
    example: 15,
  })
  @Type(() => Number)
  @IsInt()
  TASK_TIME: number;

  @ApiProperty({
    description: 'Native language of the learner.',
    example: 'English',
  })
  @IsNotEmpty()
  @IsString()
  NATIVE_LANGUAGE: string;

  @ApiProperty({
    description: 'Test mode for the lesson.',
    example: 'practice',
  })
  @IsNotEmpty()
  @IsString()
  TEST_MODE: string;

  @ApiProperty({
    description: 'Lesson title.',
    example: 'Auto',
  })
  @IsNotEmpty()
  @IsString()
  LESSON_TITLE: string;
}
