// src/auth/dto/register.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    example: 'StrongPass123!',
    description: 'User password',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

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
}
