// src/module/user/dto/create-platform-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsIn } from 'class-validator';

export class CreatePlatformUserDto {
  @ApiProperty({ example: 'manager@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'CONTENT_MANAGER', enum: ['CONTENT_MANAGER', 'SUPORT_MANAGER'] })
  @IsIn(['CONTENT_MANAGER', 'SUPORT_MANAGER'])
  role: 'CONTENT_MANAGER' | 'SUPORT_MANAGER';
}
