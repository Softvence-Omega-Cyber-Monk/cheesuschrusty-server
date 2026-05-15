import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsInt,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { LessonType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

const lessonTypes = Object.values(LessonType);

export class CreateLessonContainerDto {
  @ApiProperty({
    description: 'The AI provider used for the lesson.',
    example: 'OPENAI',
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : (value as string),
  )
  provider: string;

  @ApiProperty({
    description: 'Level identifier for the lesson.',
    example: 'A1',
  })
  @IsNotEmpty()
  @IsString()
  LEVEL_ID: string;

  @ApiProperty({
    description: 'Human-friendly level title.',
    example: 'standard',
  })
  @IsNotEmpty()
  @IsString()
  level_title: string;

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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : (value as string),
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
    description: 'Lesson topic.',
    example: 'Daily Conversations',
  })
  @IsNotEmpty()
  @IsString()
  topic: string;

  @ApiProperty({
    description: 'Lesson domain.',
    example: 'Auto',
  })
  @IsNotEmpty()
  @IsString()
  DOMAIN: string;

  @ApiProperty({
    description: 'Whether this lesson/domain is available for pro users.',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  is_pro?: boolean = false;

  @ApiProperty({
    description:
      'Task schema label. Suggested values: mcq, writing, gapfill, matching, speaking, transform, truefalse.',
    example: 'mcq',
  })
  @IsNotEmpty()
  @IsString()
  schema: string;

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

  @ApiProperty({
    description:
      'A custom seed to guide AI content generation (e.g., specific vocabulary or context).',
    example: 'Focus on restaurant vocabulary and past tense verbs.',
    required: false,
  })
  @IsOptional()
  @IsString()
  GENERATION_SEED?: string;
}
