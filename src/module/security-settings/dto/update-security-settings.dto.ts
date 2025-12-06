// src/module/security-settings/dto/update-security-settings.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class UpdateSecuritySettingsDto {
  // -------------------------
  // Password Policy
  // -------------------------
  @ApiPropertyOptional({ description: 'Minimum password length', example: 8 })
  @IsOptional()
  @IsInt()
  @Min(4)
  minPasswordLength?: number;

  @ApiPropertyOptional({ description: 'Days before password expires', example: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  passwordExpiryDays?: number;

  @ApiPropertyOptional({ description: 'Require special characters in passwords', example: true })
  @IsOptional()
  @IsBoolean()
  requireSpecialChars?: boolean;

  @ApiPropertyOptional({ description: 'Require uppercase letters in passwords', example: true })
  @IsOptional()
  @IsBoolean()
  requireUppercaseLetters?: boolean;

  // -------------------------
  // Session Management
  // -------------------------
  @ApiPropertyOptional({ description: 'Session timeout in days', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionTimeoutDays?: number;

  @ApiPropertyOptional({ description: 'Max failed login attempts before temporary ban', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxLoginAttempts?: number;

  // -------------------------
  // Data Privacy
  // -------------------------
  @ApiPropertyOptional({ description: 'Enable automatic deletion of inactive user data', example: true })
  @IsOptional()
  @IsBoolean()
  dataRetentionPolicy?: boolean;

  @ApiPropertyOptional({ description: 'Number of days before inactive user data is deleted', example: 365 })
  @IsOptional()
  @IsInt()
  @Min(30) // minimum 1 month recommended
  dataRetentionDays?: number;

  @ApiPropertyOptional({ description: 'Enable GDPR compliance mode', example: false })
  @IsOptional()
  @IsBoolean()
  gdprComplianceMode?: boolean;
}
