// src/auth/dto/register.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsIn,
  IsInt,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiPropertyOptional({
    example: 'Marco Rossi',
    description: 'Display name of the user',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'marco_rossi',
    description:
      'Unique username (3-30 characters, alphanumeric and underscores only)',
  })
  @IsNotEmpty({ message: 'Username is required' })
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Matches(/^[a-zA-Z0-9_]{3,30}$/, {
    message:
      'Username must be 3-30 characters long and contain only letters, numbers, and underscores',
  })
  username: string;

  @ApiProperty({
    example: 'marco@example.com',
    description: 'Unique email address',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'User password',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Daily study goal in minutes',
  })
  @IsOptional()
  @IsInt({ message: 'Daily goal must be an integer' })
  dailyGoalMinutes?: number;

  @ApiProperty({
    description: 'Set Role',
    example: 'SUPER_ADMIN / USER',
  })
  @IsEnum(Role)
  @IsOptional()
  role: Role;
}
