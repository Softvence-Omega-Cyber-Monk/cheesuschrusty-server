import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested, ArrayMinSize, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Defines the structure for a single card item within a bulk upload request.
 */
export class BulkCardItem {
    @IsNotEmpty()
    @IsString()
    @MaxLength(500)
    frontText: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(500)
    backText: string;
}

/**
 * Defines the structure for a bulk upload request.
 */
export class BulkUploadDto {
    @IsInt()
    @IsNotEmpty()
    categoryId: number;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => BulkCardItem)
    cards: BulkCardItem[];
}

/**
 * Defines the structure for updating an existing card.
 */
export class UpdateCardDto {
    @IsInt()
    @IsNotEmpty()
    cardId: number;
    
    @IsOptional()
    @IsString()
    @MaxLength(500)
    frontText?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    backText?: string;
    
    @IsOptional()
    @IsInt()
    categoryId?: number; // Allows moving the card to a different category
}