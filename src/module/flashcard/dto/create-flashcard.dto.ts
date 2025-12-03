import { IsString, IsNotEmpty, IsInt, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Difficulty } from '@prisma/client';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new Flashcard Category.
 */
export class CreateCategoryDto {
  @ApiProperty({ 
    description: 'The title of the flashcard category.', 
    example: 'Basic Italian Greetings' 
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ 
    description: 'The difficulty level of the category.', 
    enum: Difficulty,
    example: Difficulty.A1 
  })
  @IsEnum(Difficulty)
  @IsNotEmpty()
  difficulty: Difficulty;
}

/**
 * DTO for creating a single new Card within an existing category.
 */
export class CreateCardDto {
  @ApiProperty({ 
    description: 'The text displayed on the front of the card (e.g., foreign word).', 
    example: 'Ciao' 
  })
  @IsString()
  @IsNotEmpty()
  frontText: string;

  @ApiProperty({ 
    description: 'The text displayed on the back of the card (e.g., native translation).', 
    example: 'Hello / Bye' 
  })
  @IsString()
  @IsNotEmpty()
  backText: string;

  @ApiProperty({ 
    description: 'The ID of the category this card belongs to.', 
    example: 1 
  })
  @IsInt()
  @IsNotEmpty()
  categoryId: number;
}



export class BulkUploadCardsDto {
  @ApiProperty({
    description: 'ID of the category where cards will be uploaded.',
    example: 3,
  })
  @IsInt()
  categoryId: number;

  @ApiProperty({
    description: 'List of cards to upload.',
    type: [CreateCardDto],
    example: [
      { frontText: 'Bonjour', backText: 'Hello' },
      { frontText: 'Merci', backText: 'Thank you' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCardDto)
  cards: CreateCardDto[];
}


export class UpdateCardDto {
  @ApiPropertyOptional({
    description: 'Updated front text of the card.',
    example: 'Buongiorno',
  })
  @IsString()
  @IsOptional()
  frontText?: string;

  @ApiPropertyOptional({
    description: 'Updated back text of the card.',
    example: 'Good morning',
  })
  @IsString()
  @IsOptional()
  backText?: string;
}
