import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsUUID, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for the payload when a user submits a grade for a card review.
 */
export class GradeCardDto {
  @ApiProperty({
    description: 'The unique ID of the active study session.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'The unique ID of the card being graded.',
    example: 42,
    type: Number,
  })
  @IsInt()
  @Min(1)
  cardId: number;

  @ApiProperty({
    description: 'The grade given by the user based on recall quality (SM-2 algorithm).',
    example: 3,
    minimum: 0,
    maximum: 3,
    type: Number,
  })
  @IsInt()
  @Min(0)
  @Max(3)
  grade: number; // 0=Forgot, 1=Unsure, 2=Good, 3=Perfect
}

/**
 * DTO for starting or resuming a flashcard session.
 */
export class StartSessionDto {
  @ApiProperty({
    description: 'The ID of the flashcard category (e.g., Basic Vocabulary) to study.',
    example: 5,
    type: Number,
  })
  @IsInt()
  @Min(1)
  categoryId: number;
}



export class PauseSessionDto {
  @ApiProperty({ 
    description: 'The unique ID of the session to be paused.',
    example: 'uuid-1234-abcd-5678'
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}