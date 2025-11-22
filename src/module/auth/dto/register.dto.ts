// src/auth/dto/register.dto.ts

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class RequestOtpBodyDto {
  @ApiProperty({
    example: 'marco.rossi@gmail.com',
    description: 'The email address where the OTP will be sent',
  })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class RegisterDto {
  @ApiPropertyOptional({
    example: 'Marco Rossi',
    description: 'Display name of the user',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'marco@example.com',
    description: 'Unique email address',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({
    example: '12345678',
    description: 'Password (min 8 characters)',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiPropertyOptional({
    enum: Gender,
    example: 'MALE',
    description: 'Used for personalized TTS voice selection',
  })
  @IsOptional()
  @IsEnum(Gender, { message: 'Gender must be MALE, FEMALE or OTHER' })
  gender?: Gender;

  @ApiPropertyOptional({
    example: 'Spanish',
    description: 'User native language (default: English)',
  })
  @IsOptional()
  @IsString()
  nativeLanguage?: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Daily study goal in minutes',
    enum: [10, 15, 20, 30, 45, 60],
  })
  @IsOptional()
  @IsIn([10, 15, 20, 30, 45, 60], {
    message: 'Daily goal must be 10, 15, 20, 30, 45 or 60 minutes',
  })
  dailyGoalMinutes?: number;

  @ApiProperty({
    example: '483920',
    description: '6-digit OTP sent to email',
  })
  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString()
  @MinLength(6, { message: 'OTP must be 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain exactly 6 digits' })
  code: string;
}