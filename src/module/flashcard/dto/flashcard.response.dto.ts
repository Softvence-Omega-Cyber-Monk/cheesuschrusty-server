import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Represents the immediate session feedback counters.
 * This is used during an active session (Correct/Incorrect counts on the sidebar).
 */
export class SessionScoreDto {
  @ApiProperty({ description: 'Number of cards successfully reviewed (Grade 2 or 3) in the current session.', example: 8 })
  correctCount: number;

  @ApiProperty({ description: 'Number of cards reviewed with difficulty (Grade 0 or 1) in the current session.', example: 4 })
  incorrectCount: number;
}

/**
 * Represents a single flashcard to be shown to the user.
 */
export class FlashcardResponseDto {
  @ApiProperty({ description: 'The unique ID of the card.', example: 101 })
  cardId: number;

  @ApiProperty({ description: 'The front text of the card (e.g., the word in the foreign language).', example: 'Ciao' })
  frontText: string;

  @ApiProperty({ description: 'The back text of the card (e.g., the meaning in the native language).', example: 'Hello' })
  backText: string;

  @ApiProperty({ description: 'The current calculated interval in days until the next review.', example: 7 })
  currentInterval: number; // For display/debug purposes on the card view
}

/**
 * Response DTO for successfully starting or resuming a session.
 * This is the primary payload needed by the study screen.
 */
export class StartSessionResponseDto {
  @ApiProperty({ description: 'The unique ID of the newly created or resumed session.', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  sessionId: string;

  @ApiProperty({ description: 'The status of the session.', example: 'ACTIVE' })
  status: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  
  @ApiProperty({ description: 'The number of cards remaining in the queue for this session.', example: 25 })
  cardsRemaining: number;

  @ApiProperty({ type: SessionScoreDto, description: 'The current correct/incorrect counters for this session.' })
  scores: SessionScoreDto;

  @ApiProperty({ type: FlashcardResponseDto, description: 'The details of the first card to be shown to the user.' })
  currentCard: FlashcardResponseDto;
}

/**
 * Response DTO for the result after a card is graded.
 * This is the response to the POST /grade endpoint.
 */
export class GradeCardResponseDto {
  @ApiProperty({ type: SessionScoreDto, description: 'The updated correct/incorrect counters for the session.' })
  updatedScores: SessionScoreDto;

  @ApiPropertyOptional({ type: FlashcardResponseDto, description: 'The details of the next card to be shown. Omitted if the session is finished.' })
  nextCard?: FlashcardResponseDto;

  @ApiProperty({ description: 'True if the session queue is now empty.', example: false })
  sessionFinished: boolean;
}