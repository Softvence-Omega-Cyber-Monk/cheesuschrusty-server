import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents the summary metrics for a single flashcard category on the dashboard.
 */
export class CategorySummaryDto {
  @ApiProperty({ description: 'The unique ID of the flashcard category.', example: 1 })
  categoryId: number;
  
  @ApiProperty({ description: 'The title of the category (e.g., "Basic Italian Vocabulary").', example: 'Basic Italian Vocabulary' })
  categoryTitle: string;

  @ApiProperty({ description: 'Total number of cards in this category.', example: 150 })
  total: number;
  
  @ApiProperty({ description: 'Number of cards ready for review today.', example: 15 })
  due: number;

  @ApiProperty({ description: 'Number of cards successfully promoted to a long interval (e.g., >= 30 days).', example: 85 })
  mastered: number;
  
  @ApiProperty({ description: 'Indicates if an active or paused study session exists for this category.', example: true })
  isActiveSession: boolean;
}

/**
 * Represents the global, lifetime metrics displayed on the dashboard footer.
 */
export class LifetimeMetricsDto {
  @ApiProperty({ description: 'Total number of completed study sessions across all categories.', example: 45 })
  sessionsCompleted: number;

  @ApiProperty({ description: 'Total number of unique card grades submitted (total cards studied).', example: 1250 })
  totalCardsStudied: number;

  @ApiProperty({ description: 'The user\'s lifetime correct grade percentage.', example: 78.5 })
  averageScorePercentage: number;
}

/**
 * Response DTO for the flashcard dashboard overview.
 */
export class FlashcardOverviewResponseDto {
  @ApiProperty({ type: [CategorySummaryDto], description: 'List of all flashcard categories with their progress summary.' })
  categories: CategorySummaryDto[];

  @ApiProperty({ type: LifetimeMetricsDto, description: 'Aggregated lifetime study statistics for the user.' })
  lifetimeMetrics: LifetimeMetricsDto;
}