import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class UpdateBrandingDto {
  @ApiPropertyOptional({
    description: 'Primary brand color (HEX).',
    example: '#630213',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'primaryColor must be a valid hex color.',
  })
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Secondary brand color (HEX).',
    example: '#3F83F5',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'secondaryColor must be a valid hex color.',
  })
  secondaryColor?: string;

  @ApiPropertyOptional({
    description: 'Accent brand color (HEX).',
    example: '#0e0ebf',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'accentColor must be a valid hex color.',
  })
  accentColor?: string;

  @ApiPropertyOptional({
    description: 'Heading font name.',
    example: 'Inter',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  headingFont?: string;

  @ApiPropertyOptional({
    description: 'Body font name.',
    example: 'Roboto',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  bodyFont?: string;

  // ---------------- File uploads ----------------
  @ApiPropertyOptional({
    description: 'Brand logo image file',
    type: 'string',
    format: 'binary', // important for Swagger to show file input
  })
  @IsOptional()
  logo?: any;

  @ApiPropertyOptional({
    description: 'Favicon image file',
    type: 'string',
    format: 'binary', // important for Swagger to show file input
  })
  @IsOptional()
  favicon?: any;
}
