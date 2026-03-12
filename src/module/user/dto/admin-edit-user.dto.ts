import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Difficulty } from '@prisma/client';

export class AdminEditUserDto {
  @ApiProperty({
    example: 'John Doe',
    required: false,
    description: 'User full name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'user@example.com',
    required: false,
    description: 'User email address',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Whether user account is active',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 'English',
    required: false,
    description: 'Native language',
  })
  @IsOptional()
  @IsString()
  nativeLang?: string;

  @ApiProperty({
    example: 'Italian',
    required: false,
    description: 'Target learning language',
  })
  @IsOptional()
  @IsString()
  targetLang?: string;

  @ApiProperty({
    example: 'B1',
    required: false,
    enum: Difficulty,
    description: 'Current CEFR level',
  })
  @IsOptional()
  @IsEnum(Difficulty)
  currentLevel?: Difficulty;

  @ApiProperty({
    example: 500,
    required: false,
    description: 'Total XP points',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  xp?: number;

  @ApiProperty({
    example: 7,
    required: false,
    description: 'Current streak count',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  currentStreak?: number;

  @ApiProperty({
    example: 30,
    required: false,
    description: 'Longest streak achieved',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  longestStreak?: number;

  @ApiProperty({
    example: 1200,
    required: false,
    description: 'Total minutes studied',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  totalMinutesStudied?: number;

  @ApiProperty({
    example: 250,
    required: false,
    description: 'Total words learned',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  wordsLearned?: number;

  @ApiProperty({
    example: 15,
    required: false,
    description: 'Total lessons completed',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  lessonsCompleted?: number;

  @ApiProperty({
    example: 30,
    required: false,
    description: 'Daily study goal in minutes',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(480)
  dailyGoalMinutes?: number;

  @ApiProperty({
    example: 'Europe/Rome',
    required: false,
    description: 'User timezone',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Enable weekly update emails',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  weeklyUpdateEnabled?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Enable streak reminder notifications',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  streakRemindersEnabled?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Enable achievement alert notifications',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  achievementAlertsEnabled?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Whether user has used free trial',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasUsedTrial?: boolean;
}
