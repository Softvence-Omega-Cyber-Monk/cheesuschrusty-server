// src/module/platform-settings/dto/update-platform-settings.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @ApiPropertyOptional({ example: "ItalianMaster", description: "Platform name" })
  @IsOptional()
  @IsString()
  platformName?: string;

  @ApiPropertyOptional({ example: "Learn Italian Fast", description: "Platform title" })
  @IsOptional()
  @IsString()
  platformTitle?: string;

  @ApiPropertyOptional({ 
    example: "A complete platform for mastering Italian", 
    description: "Platform description"
  })
  @IsOptional()
  @IsString()
  platformDescription?: string;

  @ApiPropertyOptional({ example: "English" })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @ApiPropertyOptional({ example: "Europe/Rome" })
  @IsOptional()
  @IsString()
  defaultTimezone?: string;

  // -----------------------------
  // FEATURE TOGGLES
  // -----------------------------
  @ApiPropertyOptional({
    example: true,
    description: "Whether users can register new accounts"
  })
  @IsOptional()
  @IsBoolean()
  allowNewRegistration?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "Enable/disable free trial"
  })
  @IsOptional()
  @IsBoolean()
  freeTrialEnabled?: boolean;

  @ApiPropertyOptional({
    example: 7,
    description: "Free trial duration in days (only when freeTrialEnabled = true)"
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  freeTrialPeriodDays?: number;

  @ApiPropertyOptional({
    example: false,
    description: "Maintenance mode (block platform for all except admins)"
  })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;
}
