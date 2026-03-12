import { CredentialProvider } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class RecordIntegrationUsageDto {
  @ApiProperty({ enum: CredentialProvider, example: CredentialProvider.OPENAI })
  @IsEnum(CredentialProvider)
  provider: CredentialProvider;

  @ApiProperty({ example: 'chat.completions' })
  @IsString()
  operation: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  requestCount?: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  inputUnits?: number;

  @ApiPropertyOptional({ example: 450 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  outputUnits?: number;

  @ApiPropertyOptional({ example: 1650 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalUnits?: number;

  @ApiPropertyOptional({ example: 0.023 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costUsd?: number;

  @ApiPropertyOptional({
    example: { model: 'gpt-4.1-mini', userId: 'user_123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-03-11T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
