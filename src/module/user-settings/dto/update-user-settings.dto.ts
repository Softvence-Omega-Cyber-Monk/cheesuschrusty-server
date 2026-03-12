import {
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ThemeMode {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({
    enum: ThemeMode,
    example: ThemeMode.DARK,
    description: 'Theme mode preference',
  })
  @IsOptional()
  @IsEnum(ThemeMode, { message: 'Invalid theme mode' })
  themeMode?: ThemeMode;

  @ApiPropertyOptional({
    example: 'British Male',
    description: 'System voice preference',
  })
  @IsOptional()
  systemVoice?: string;

  @ApiPropertyOptional({
    example: 1.0,
    description: 'Voice speed (0.5 to 2.0)',
    minimum: 0.5,
    maximum: 2.0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Voice speed must be a number' })
  @Min(0.5, { message: 'Voice speed must be at least 0.5' })
  @Max(2.0, { message: 'Voice speed must not exceed 2.0' })
  voiceSpeed?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Newsletter subscription status',
  })
  @IsOptional()
  @IsBoolean({ message: 'Newsletter enabled must be a boolean' })
  newsletterEnabled?: boolean;
}
