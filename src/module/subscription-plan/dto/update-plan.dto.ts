import { 
  IsNumber, 
  IsString, 
  IsNotEmpty, 
  IsPositive, 
  IsBoolean, 
  IsOptional, 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlanDto {
  @ApiProperty({ description: 'The new Lemon Squeezy Variant ID (e.g., variant_12345)', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lemonVariantId?: string;

  @ApiProperty({ description: 'The new display price (e.g., 9.99)', required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiProperty({ description: 'Whether the plan should be visible/purchasable.', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  
}
