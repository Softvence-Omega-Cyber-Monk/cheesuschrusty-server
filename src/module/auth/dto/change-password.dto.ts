// src/user/dto/change-password.dto.ts
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: '87654321',
    description: 'Your current password',
  })
  @IsString({ message: 'Old password must be a string.' })
  oldPassword: string;

  @ApiProperty({
    example: '12345678',
    description: 'Your new password (minimum 8 characters)',
  })
  @IsString({ message: 'New password must be a string.' })
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  newPassword: string;
}
