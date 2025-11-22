import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuoteDto {
  @ApiProperty({ example: 'Albert Einstein' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Imagination is more important than knowledge.' })
  @IsString()
  @IsNotEmpty()
  quote: string;


  @IsOptional()
  @IsString()
  imageUrl?: string;
}
