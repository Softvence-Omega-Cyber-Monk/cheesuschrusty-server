import { IsNumber, IsString, IsNotEmpty, IsPositive, IsBoolean, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlanDto {
  @ApiProperty({ description: 'The new Stripe Price ID (e.g., price_1NfT...)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stripePriceId?: string;

  @ApiProperty({ description: 'The new display price (e.g., 9.99)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiProperty({ description: 'Whether the plan should be visible/purchasable.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  
}