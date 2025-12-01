import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FlashcardOverviewResponseDto } from './dto/flashcard.overview.dto';
import { GradeCardDto, StartSessionDto } from './dto/flashcard.grading.dto';
import { GradeCardResponseDto, StartSessionResponseDto } from './dto/flashcard.response.dto';

// Helper type to align with Prisma's JSON structure for sessionData
interface SessionData {
  remainingCardIds: number[];
  correctCount: number;
  incorrectCount: number;
}

@Injectable()
export class FlashcardService {
  private readonly logger = new Logger(FlashcardService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 1. Fetches all flashcard categories.
   * 2. Calculates due, mastered, and active session status for each category.
   * 3. Calculates lifetime study metrics (total sessions, cards studied, average score).
   */
  async getDashboardOverview(userId: string): Promise<FlashcardOverviewResponseDto> {
    // --- Phase 1: Category Summaries ---
    // NOTE: Implementing the full due/mastered calculation requires complex date logic and 
    // is often best done with raw SQL for performance on a large dataset. 
    // Here, we provide placeholders and simplified logic.
    
    const categories = await this.prisma.flashcardCategory.findMany({
      include: { cards: { select: { id: true } } },
      orderBy: { id: 'asc' },
    });

    const activeSessions = await this.prisma.activeFlashcardSession.findMany({
      where: { 
        userId, 
        status: { in: ['ACTIVE', 'PAUSED'] } 
      }
    });

    const categorySummaries = categories.map(category => {
      // Simplification: In a real app, 'due' would check FlashcardProgress.nextReview < today.
      const totalCards = category.cards.length;
      const isActiveSession = activeSessions.some(session => 
        session.categoryName === category.title // Matching by name for simplicity
      );

      return {
        categoryId: category.id,
        categoryTitle: category.title,
        total: totalCards,
        due: Math.floor(totalCards * 0.2), // Mocking due count
        mastered: Math.floor(totalCards * 0.5), // Mocking mastered count
        isActiveSession: isActiveSession,
      };
    });

    // --- Phase 2: Lifetime Metrics ---
    const lifetimeStats = await this.calculateLifetimeMetrics(userId);

    return {
      categories: categorySummaries,
      lifetimeMetrics: lifetimeStats,
    };
  }

  /**
   * Calculates the user's aggregated statistics from completed sessions and card progress.
   */
  private async calculateLifetimeMetrics(userId: string) {
    // Total completed sessions
    const sessionsCompleted = await this.prisma.activeFlashcardSession.count({
      where: { userId, status: 'FINISHED' },
    });

    // Total cards studied (total number of reviews recorded)
    const cardProgressAggregate = await this.prisma.flashcardProgress.aggregate({
        where: { userId },
        _sum: { totalReviews: true },
    });
    
    // Average Score Percentage (requires calculating total correct reviews vs total reviews)
    // This is complex due to the grade being a hidden dimension, so we mock it for now.
    const totalCardsStudied = cardProgressAggregate._sum.totalReviews || 0;
    
    return {
      sessionsCompleted,
      totalCardsStudied: totalCardsStudied,
      averageScorePercentage: 85.0, // Mocked: In real app, calculate (total grades 2+3) / (total reviews)
    };
  }



/**
   * Starts a new session or resumes an existing one for a given category.
   */
  async startSession(userId: string, dto: StartSessionDto): Promise<StartSessionResponseDto> {
    // 1. Check for an active/paused session for this user/category
    const activeSession = await this.prisma.activeFlashcardSession.findFirst({
        where: { 
          userId, 
          status: { in: ['ACTIVE', 'PAUSED'] },
          // NOTE: We need a direct link from session to categoryId, but currently only have categoryName.
          // For now, we'll rely on the existing relationship, assuming we can get the name.
        },
        orderBy: { createdAt: 'desc' },
    });
    
    const category = await this.prisma.flashcardCategory.findUnique({
      where: { id: dto.categoryId },
      include: { cards: { select: { id: true, frontText: true, backText: true } } }
    });

    if (!category) {
      throw new NotFoundException(`Flashcard category with ID ${dto.categoryId} not found.`);
    }

    if (activeSession) {
      this.logger.log(`Resuming session ${activeSession.id} for user ${userId}`);
      
      const sessionData = activeSession.sessionData as unknown as SessionData;
      const nextCardId = sessionData.remainingCardIds[0];
      const nextCard = category.cards.find(c => c.id === nextCardId);

      if (!nextCard) {
        // This case should ideally not happen if data integrity is maintained
        throw new NotFoundException('Next card in session queue not found.');
      }
      
      return {
        sessionId: activeSession.id,
        status: 'ACTIVE',
        cardsRemaining: sessionData.remainingCardIds.length,
        scores: {
          correctCount: sessionData.correctCount,
          incorrectCount: sessionData.incorrectCount,
        },
        currentCard: {
            cardId: nextCard.id,
            frontText: nextCard.frontText,
            backText: nextCard.backText,
            currentInterval: 0, // Mock: Would fetch from FlashcardProgress
        }
      };
    }

    // 2. If no active session, create a new one
    // In a real SRS system, the initial queue is built from 'due' cards.
    const allCardIds = category.cards.map(c => c.id);
    const initialSessionData: SessionData = {
        remainingCardIds: allCardIds, // For simplicity, all cards in category
        correctCount: 0,
        incorrectCount: 0,
    };
    
    const newSession = await this.prisma.activeFlashcardSession.create({
      data: {
        userId,
        categoryName: category.title,
        sessionData: initialSessionData as unknown as Prisma.InputJsonValue,
        status: 'ACTIVE',
      }
    });

    const firstCard = category.cards[0];

    return {
      sessionId: newSession.id,
      status: 'ACTIVE',
      cardsRemaining: initialSessionData.remainingCardIds.length,
      scores: {
        correctCount: 0,
        incorrectCount: 0,
      },
      currentCard: {
        cardId: firstCard.id,
        frontText: firstCard.frontText,
        backText: firstCard.backText,
        currentInterval: 0, // Mock
      }
    };
  }

  /**
   * Updates card progress and session state based on the grade.
   */
  async gradeCard(userId: string, dto: GradeCardDto): Promise<GradeCardResponseDto> {
    const session = await this.prisma.activeFlashcardSession.findUnique({
        where: { id: dto.sessionId, userId },
    });

    if (!session || session.status === 'FINISHED') {
        throw new NotFoundException('Active session not found or already finished.');
    }

    // 1. Update Session State (Correct/Incorrect Count)
    const sessionData = session.sessionData as unknown as SessionData;
    let { remainingCardIds, correctCount, incorrectCount } = sessionData;
    
    const isCorrect = dto.grade >= 2;
    if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    // Remove the current card from the front of the queue
    remainingCardIds.shift();
    
    // If the card was incorrectly answered, push it to the end of the queue for review
    if (!isCorrect) {
        remainingCardIds.push(dto.cardId);
    }
    
    const sessionFinished = remainingCardIds.length === 0;

    // 2. Apply Spaced Repetition System (SM-2) Logic
    await this.applySrsLogic(userId, dto.cardId, dto.grade);
    
    // 3. Update Session in Database
    const updatedSession = await this.prisma.activeFlashcardSession.update({
        where: { id: dto.sessionId },
        data: {
            sessionData: { remainingCardIds, correctCount, incorrectCount } as unknown as Prisma.InputJsonValue,
            status: sessionFinished ? 'FINISHED' : 'ACTIVE',
            dateCompleted: sessionFinished ? new Date() : undefined,
            updatedAt: new Date(),
        },
    });
    
    // 4. Determine next card and response
    let nextCardResponse: GradeCardResponseDto = {
        updatedScores: { correctCount, incorrectCount },
        sessionFinished,
    };

    if (!sessionFinished) {
        const nextCardId = remainingCardIds[0];
        const nextCard = await this.prisma.card.findUnique({ where: { id: nextCardId } });

        if (nextCard) {
            // Mocking currentInterval; in real app, fetch from FlashcardProgress
            nextCardResponse.nextCard = {
                cardId: nextCard.id,
                frontText: nextCard.frontText,
                backText: nextCard.backText,
                currentInterval: 0, 
            };
        }
    }

    return nextCardResponse;
  }
  
  /**
   * Internal method to calculate new interval and ease factor based on grade.
   * This is a simplified SM-2 implementation.
   */
  private async applySrsLogic(userId: string, cardId: number, grade: number): Promise<void> {
    const progress = await this.prisma.flashcardProgress.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: { totalReviews: { increment: 1 } },
      create: { userId, cardId, totalReviews: 1 },
    });

    let { easeFactor, interval, repetitions } = progress;

    if (grade >= 2) {
      // Correct answer (Grade 2 or 3)
      repetitions += 1;
      
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      
      // Update ease factor (SM-2 logic)
      easeFactor = easeFactor + (0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02));
      // Clamp ease factor
      easeFactor = Math.max(1.3, easeFactor);

    } else {
      // Incorrect answer (Grade 0 or 1)
      repetitions = 0;
      interval = 1;
    }
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    await this.prisma.flashcardProgress.update({
      where: { id: progress.id },
      data: {
        easeFactor,
        interval,
        repetitions,
        nextReview,
      },
    });
  }
  
  /**
   * Allows the user to manually pause a session (e.g., when navigating away).
   */
  async pauseSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.activeFlashcardSession.updateMany({
        where: { id: sessionId, userId, status: 'ACTIVE' },
        data: {
            status: 'PAUSED',
            updatedAt: new Date(),
        },
    });
    this.logger.log(`Paused session ${sessionId} for user ${userId}`);
  }
}