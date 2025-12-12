import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

/**
 * Common DTO for the card object returned during a session.
 */
class CardInSessionDto {
  @ApiProperty({ description: 'The unique ID of the card.', example: 52 })
  cardId: number;

  @ApiProperty({ description: 'The text displayed on the front of the card.', example: 'Hash Map' })
  frontText: string;

  @ApiProperty({ description: 'The text displayed on the back of the card.', example: 'A data structure using a hash function.' })
  backText: string;

  @ApiProperty({ description: 'The current calculated interval (days) for the next review based on SRS.', example: 6 })
  currentInterval: number;

  
}

/**
 * Common DTO for session scores.
 */
class SessionScoresDto {
  @ApiProperty({ description: 'Total number of cards graded correctly (grade >= 2) in this session.', example: 5 })
  correctCount: number;

  @ApiProperty({ description: 'Total number of cards graded incorrectly (grade < 2) in this session.', example: 2 })
  incorrectCount: number;
}

/**
 * Response DTO for POST /flashcards/session/start (StartSessionResponseDto)
 * This is the initial or resumed state.
 */
export class StartSessionResponseDto {
  @ApiProperty({ description: 'The unique ID of the active session.', example: 'uuid-1234-abcd-5678' })
  sessionId: string;

  @ApiProperty({ description: 'The current status of the session (ACTIVE, PAUSED).', example: 'ACTIVE' })
  status: 'ACTIVE' | 'PAUSED';

  @ApiProperty({ description: 'The number of card IDs left in the review queue.', example: 15 })
  cardsRemaining: number;

  @ApiProperty({ type: SessionScoresDto, description: 'The current scores for the session.' })
  scores: SessionScoresDto;

  @ApiProperty({ type: CardInSessionDto, description: 'The card currently presented to the user.' })
  currentCard: CardInSessionDto;

  // TIME TRACKING — REQUIRED
  @ApiProperty({ description: 'Seconds spent in session', example: 523 })
  totalTimeSeconds: number;

  @ApiProperty({ description: 'Formatted MM:SS', example: '08:43' })
  formattedTime: string;
}

/**
 * Response DTO for POST /flashcards/session/grade (GradeCardResponseDto)
 * The response will now use 'currentCard' for the next card to ensure consistency.
 */
export class GradeCardResponseDto {
  @ApiProperty({ type: SessionScoresDto, description: 'The updated scores for the session.' })
  scores: SessionScoresDto; // Renamed from updatedScores

  @ApiProperty({ description: 'True if the session finished with this grade submission.', example: false })
  sessionFinished: boolean;

  @ApiProperty({ 
    type: CardInSessionDto, 
    nullable: true, 
    description: 'The next card to be presented. Null if sessionFinished is true.' 
  })
  currentCard: CardInSessionDto | null; // Renamed from nextCard


  // TIME TRACKING — REQUIRED
  @ApiProperty({ description: 'Updated time after grading', example: 531 })
  totalTimeSeconds: number;

  @ApiProperty({ description: 'Formatted MM:SS', example: '08:51' })
  formattedTime: string;
}



export class GetCategoryQueryDto {
  @ApiProperty({
    description: 'ID of the category to load.',
    example: 1,
  })
  @Type(() => Number)   // ← THIS FIXES THE ERROR
  @IsInt()
  @IsNotEmpty()
  categoryId: number;
}