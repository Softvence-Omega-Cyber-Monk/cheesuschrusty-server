// src/auth/dto/password-recovery.dto.ts
import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestResetCodeDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address to receive the reset code',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}

export class VerifyResetCodeDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address used to receive the reset code',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: '1234',
    description: '4-digit reset code sent to the user\'s email',
  })
  @IsString()
  @Length(4, 4, { message: 'Code must be 4 characters' })
  code: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address associated with the account',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: 'newStrongPassword123',
    description: 'New password with at least 6 characters',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    example: 'newStrongPassword123',
    description: 'Confirm the new password',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  confirmPassword: string;
}
