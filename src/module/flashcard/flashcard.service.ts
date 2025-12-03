import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FlashcardOverviewResponseDto } from './dto/flashcard.overview.dto';
import { GradeCardDto, StartSessionDto } from './dto/flashcard.grading.dto';
import { GradeCardResponseDto, StartSessionResponseDto } from './dto/flashcard.response.dto';
import { CreateCardDto, CreateCategoryDto, UpdateCardDto } from './dto/create-flashcard.dto';

// Define a reasonable limit for a single study session
const SESSION_LIMIT = 10; 

// Helper type to align with Prisma's JSON structure for sessionData
interface SessionData {
    remainingCardIds: number[];
    correctCount: number;
    incorrectCount: number;
    // Note: currentCardId is implied to be remainingCardIds[0] in this simplified linear flow.
}

@Injectable()
export class FlashcardService {
    private readonly logger = new Logger(FlashcardService.name);

    constructor(private prisma: PrismaService) {}


    // ====================================================================
    // ------------------------- CONTENT MANAGEMENT METHODS -----------------
    // ====================================================================

    /**
     * Creates a new flashcard category.
     */
    async createCategory(dto: CreateCategoryDto) {
        this.logger.log(`Creating new category: ${dto.title}`);
        return this.prisma.flashcardCategory.create({
            data: {
                title: dto.title,
                difficulty: dto.difficulty,
            },
        });
    }

    /**
     * Creates a single new card and associates it with an existing category.
     */
    async createCard(dto: CreateCardDto) {
        // 1. Check if category exists
        const categoryExists = await this.prisma.flashcardCategory.findUnique({
            where: { id: dto.categoryId },
        });

        if (!categoryExists) {
            throw new NotFoundException(`Category with ID ${dto.categoryId} not found.`);
        }

        // 2. Create the card
        this.logger.log(`Creating new card in category ${dto.categoryId}: ${dto.frontText}`);
        return this.prisma.card.create({
            data: {
                frontText: dto.frontText,
                backText: dto.backText,
                categoryId: dto.categoryId,
            },
        });
    }

// ====================================================================
// ------------------------- CATEGORY & CARD MANAGEMENT ----------------
// ====================================================================

/**
 * Fetch a category with all its cards.
 */
async getCategoryWithCards(categoryId: number) {
    const category = await this.prisma.flashcardCategory.findUnique({
        where: { id: categoryId },
        include: { cards: true },
    });

    if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    }

    return category;
}

/**
 * Update an existing card.
 */
async updateCard(cardId: number, dto: UpdateCardDto) {
    const existing = await this.prisma.card.findUnique({
        where: { id: cardId },
    });

    if (!existing) {
        throw new NotFoundException(`Card with ID ${cardId} not found.`);
    }

    return this.prisma.card.update({
        where: { id: cardId },
        data: {
            frontText: dto.frontText ?? existing.frontText,
            backText: dto.backText ?? existing.backText,
        },
    });
}

/**
 * Delete a card (cascade deletes its progress because FK is onDelete: Cascade).
 */
async deleteCard(cardId: number) {
  const existing = await this.prisma.card.findUnique({ where: { id: cardId } });

  if (!existing) {
    throw new NotFoundException(`Card with ID ${cardId} not found.`);
  }

  // Delete related progress entries first
  await this.prisma.flashcardProgress.deleteMany({
    where: { cardId },
  });

  // Then delete the card
  await this.prisma.card.delete({ where: { id: cardId } });

  return { message: 'Card deleted successfully.' };
}

/**
 * Delete a whole category (deletes all cards via FK and progress cascades).
 */
async deleteCategory(categoryId: number) {
  const existing = await this.prisma.flashcardCategory.findUnique({
    where: { id: categoryId },
  });

  if (!existing) {
    throw new NotFoundException(`Category with ID ${categoryId} not found.`);
  }

  // Delete all cards in the category (and optionally their progress)
  const cards = await this.prisma.card.findMany({ where: { categoryId } });
  for (const card of cards) {
    await this.prisma.flashcardProgress.deleteMany({ where: { cardId: card.id } });
  }
  await this.prisma.card.deleteMany({ where: { categoryId } });

  // Finally delete the category
  await this.prisma.flashcardCategory.delete({ where: { id: categoryId } });

  return { message: 'Category and all its cards deleted successfully.' };
}
/**
 * Bulk upload cards to a category.
 */
async bulkUploadCards(categoryId: number, cards: CreateCardDto[]) {
    // ensure category exists
    const category = await this.prisma.flashcardCategory.findUnique({
        where: { id: categoryId },
    });

    if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    }

    if (!cards.length) {
        throw new BadRequestException('No cards provided for bulk upload.');
    }

    const formattedCards = cards.map(card => ({
        frontText: card.frontText,
        backText: card.backText,
        categoryId,
    }));

    await this.prisma.card.createMany({
        data: formattedCards,
    });

    return { message: `${cards.length} cards uploaded successfully.` };
}



async getAllCategories() {
  return this.prisma.flashcardCategory.findMany({
    orderBy: { createdAt: 'desc' }, // latest first
    include: {
      cards: false, // set to true if you want cards included
    },
  });
}

    // ====================================================================
    // ------------------------- STUDY FLOW METHODS -------------------------
    // ====================================================================


    /**
     * 1. Fetches all flashcard categories.
     * 2. Calculates real due, mastered, and active session status for each category.
     * 3. Calculates lifetime study metrics (total sessions, cards studied, average score).
     */
    async getDashboardOverview(userId: string): Promise<FlashcardOverviewResponseDto> {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
        const MASTERY_REPETITIONS_THRESHOLD = 5; // Define mastery as 5 or more successful repetitions

        // --- Phase 1: Data Fetching ---
        const categories = await this.prisma.flashcardCategory.findMany({
            include: { cards: { select: { id: true } } },
            orderBy: { id: 'asc' },
        });

        // Fetch ALL progress records for the user in one go for efficient filtering
        const allUserProgress = await this.prisma.flashcardProgress.findMany({
            where: { userId },
        });
        
        const activeSessions = await this.prisma.activeFlashcardSession.findMany({
            where: { 
                userId, 
                status: { in: ['ACTIVE', 'PAUSED'] } 
            }
        });


        // --- Phase 2: Category Summaries Calculation (NO MORE MOCKING) ---
        const categorySummaries = categories.map(category => {
            const totalCards = category.cards.length;
            const categoryCardIds = new Set(category.cards.map(c => c.id));
            
            // Filter progress records relevant to this category
            const categoryProgress = allUserProgress.filter(p => categoryCardIds.has(p.cardId));

            // Calculate DUE cards
            const dueCount = categoryProgress.filter(p => 
                p.nextReview && p.nextReview <= today
            ).length;

            // Calculate MASTERED cards (Repetitions >= 5)
            const masteredCount = categoryProgress.filter(p => 
                p.repetitions >= MASTERY_REPETITIONS_THRESHOLD
            ).length;

            const isActiveSession = activeSessions.some(session => 
                session.categoryName === category.title 
            );

            return {
                categoryId: category.id,
                categoryTitle: category.title,
                total: totalCards,
                due: dueCount,         // Real calculation
                mastered: masteredCount, // Real calculation
                isActiveSession: isActiveSession,
            };
        });

        // --- Phase 3: Lifetime Metrics ---
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

        // Aggregate total review counts from progress records
        const progressAggregate = await this.prisma.flashcardProgress.aggregate({
            where: { userId },
            _sum: { totalReviews: true, totalCorrectReviews: true },
        });
        
        const totalCardsStudied = progressAggregate._sum.totalReviews || 0;
        const totalCorrectReviews = progressAggregate._sum.totalCorrectReviews || 0;
        
        let averageScorePercentage = 0.0;
        
        if (totalCardsStudied > 0) {
            // Calculate the actual percentage of correct answers (Grade 2 or 3)
            averageScorePercentage = (totalCorrectReviews / totalCardsStudied) * 100;
        }
        
        return {
            sessionsCompleted,
            totalCardsStudied: totalCardsStudied,
            // Round to 1 decimal place for display
            averageScorePercentage: parseFloat(averageScorePercentage.toFixed(1)),
        };
    }



    /**
     * Starts a new session or resumes an existing one for a given category.
     */
    async startSession(userId: string, dto: StartSessionDto): Promise<StartSessionResponseDto> {
        // 1. Check for an active/paused session for this user/category (RESUME LOGIC)
        const activeSession = await this.prisma.activeFlashcardSession.findFirst({
            where: { 
                userId, 
                status: { in: ['ACTIVE', 'PAUSED'] },
                // Ideally, sessions should also be linked to categoryId for reliable resume
            },
            orderBy: { createdAt: 'desc' },
        });
        
        const category = await this.prisma.flashcardCategory.findUnique({
            where: { id: dto.categoryId },
            // Select all cards to efficiently find the card details later
            include: { cards: { select: { id: true, frontText: true, backText: true } } } 
        });

        if (!category) {
            throw new NotFoundException(`Flashcard category with ID ${dto.categoryId} not found.`);
        }
        
        // --- RESUME EXISTING SESSION ---
        if (activeSession && (activeSession.categoryName === category.title)) {
            this.logger.log(`Resuming session ${activeSession.id} for user ${userId}`);
            
            const sessionData = activeSession.sessionData as unknown as SessionData;
            const nextCardId = sessionData.remainingCardIds[0];
            
            if (!nextCardId) {
                // If remainingCardIds is empty but status is ACTIVE/PAUSED, assume session is functionally finished
                await this.prisma.activeFlashcardSession.update({
                    where: { id: activeSession.id },
                    data: { status: 'FINISHED', dateCompleted: new Date() },
                });
                 throw new NotFoundException('Session queue empty. Starting new session recommended.');
            }

            const nextCard = category.cards.find(c => c.id === nextCardId);

            if (!nextCard) {
                // Should only happen if cards were deleted after session start
                throw new NotFoundException('Next card in session queue not found.');
            }
            
            // Fetch progress for the next card to get the current interval
            const cardProgress = await this.prisma.flashcardProgress.findUnique({
                where: { userId_cardId: { userId, cardId: nextCard.id } },
                select: { interval: true }
            });

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
                    currentInterval: cardProgress?.interval || 0,
                }
            };
        }

        // 2. If no active session, create a new one (NEW SESSION LOGIC)
        
        const categoryCardIds = category.cards.map(c => c.id);
        let cardIdsForSession: number[] = [];

        // --- A. Attempt to find DUE cards ---
        const dueProgressRecords = await this.prisma.flashcardProgress.findMany({
            where: {
                userId,
                cardId: { in: categoryCardIds },
                nextReview: { lte: new Date() } // Cards due today or earlier
            },
            orderBy: { nextReview: 'asc' }, 
            take: SESSION_LIMIT,
        });

        cardIdsForSession = dueProgressRecords.map(p => p.cardId);

        // --- B. Fallback to NEW cards if no cards are due ---
        if (cardIdsForSession.length === 0) {
            this.logger.log(`No due cards found. Falling back to unstudied cards.`);

            // 1. Get the IDs of all cards the user HAS progress for
            const studiedCardRecords = await this.prisma.flashcardProgress.findMany({
                where: { userId, cardId: { in: categoryCardIds } },
                select: { cardId: true }
            });
            const studiedCardIds = new Set(studiedCardRecords.map(p => p.cardId));

            // 2. Filter the category's cards to find UNSTUDIED (NEW) cards
            const newCardIds = categoryCardIds
                .filter(id => !studiedCardIds.has(id))
                .slice(0, SESSION_LIMIT);

            if (newCardIds.length > 0) {
                this.logger.log(`Found ${newCardIds.length} new cards for the session.`);
                cardIdsForSession = newCardIds;
            } 
            
            // --- C. Ultimate Fallback: Cram/Recently Reviewed Cards ---
            if (cardIdsForSession.length === 0) {
                this.logger.log(`No new cards found. Falling back to reviewing least recently reviewed cards (Cram Mode).`);
                
                // Find studied cards, ordered by nextReview date ascending (i.e., due soonest / reviewed longest ago)
                const allStudiedProgressRecords = await this.prisma.flashcardProgress.findMany({
                    where: {
                        userId,
                        cardId: { in: categoryCardIds },
                    },
                    // Order by nextReview asc, to get cards that are coming up soonest 
                    orderBy: { nextReview: 'asc' }, 
                    take: SESSION_LIMIT,
                });

                const recentlyReviewedIds = allStudiedProgressRecords.map(p => p.cardId);

                if (recentlyReviewedIds.length === 0) {
                    // This means the category is empty of both progress and cards, or all are fully mastered.
                    throw new NotFoundException('All cards in this category have been recently reviewed or mastered. Check back later!');
                }

                this.logger.log(`Found ${recentlyReviewedIds.length} cards for "cram" session.`);
                cardIdsForSession = recentlyReviewedIds;
            }
        }
        
        // --- 3. Finalize and Create Session ---

        const initialSessionData: SessionData = {
            remainingCardIds: cardIdsForSession, 
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

        const firstCardId = cardIdsForSession[0];
        // Must use .find() on the local category.cards array since they hold all card details
        const firstCard = category.cards.find(c => c.id === firstCardId); 

        if (!firstCard) {
             throw new NotFoundException('The first card selected for the session could not be found.');
        }

        // Fetch progress (might be null if it's a new card)
        const cardProgress = await this.prisma.flashcardProgress.findUnique({
            where: { userId_cardId: { userId, cardId: firstCardId } },
            select: { interval: true }
        });


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
                currentInterval: cardProgress?.interval || 0,
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
        
        // Ensure the card being graded is the one expected at the front of the queue
        const sessionData = session.sessionData as unknown as SessionData;
        const currentCardIdInQueue = sessionData.remainingCardIds[0];

        if (currentCardIdInQueue !== dto.cardId) {
            throw new BadRequestException('The card being graded does not match the expected card in the session queue. You must grade the current card before proceeding.');
        }
        
        let { remainingCardIds, correctCount, incorrectCount } = sessionData;
        
        const isCorrect = dto.grade >= 2;
        if (isCorrect) {
            correctCount++;
        } else {
            incorrectCount++;
        }

        // Remove the current card from the front of the queue
        remainingCardIds.shift();
        
        // If the card was incorrectly answered, push it to the end of the queue for re-review
        if (!isCorrect) {
            remainingCardIds.push(dto.cardId);
        }
        
        const sessionFinished = remainingCardIds.length === 0;

        // 2. Apply Spaced Repetition System (SM-2) Logic
        await this.applySrsLogic(userId, dto.cardId, dto.grade);
        
        // 3. Update Session in Database
        await this.prisma.activeFlashcardSession.update({
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
            scores: { correctCount, incorrectCount },
            sessionFinished,
            currentCard: null,
        };

        if (!sessionFinished) {
            const nextCardId = remainingCardIds[0];
            const nextCard = await this.prisma.card.findUnique({ where: { id: nextCardId } });
            const cardProgress = await this.prisma.flashcardProgress.findUnique({
                where: { userId_cardId: { userId, cardId: nextCardId } },
                select: { interval: true }
            });

            if (nextCard) {
                nextCardResponse.currentCard = {
                    cardId: nextCard.id,
                    frontText: nextCard.frontText,
                    backText: nextCard.backText,
                    currentInterval: cardProgress?.interval || 0,
                };
            }
        }

        return nextCardResponse;
    }
    
    /**
     * Internal method to calculate new interval and ease factor based on grade.
     */
    private async applySrsLogic(userId: string, cardId: number, grade: number): Promise<void> {
        const isCorrect = grade >= 2;
        
        // Find or create progress record
        const progress = await this.prisma.flashcardProgress.upsert({
            where: { userId_cardId: { userId, cardId } },
            update: { 
                totalReviews: { increment: 1 }, 
                totalCorrectReviews: isCorrect ? { increment: 1 } : undefined // Increment only if correct
            },
            create: { 
                userId, 
                cardId, 
                totalReviews: 1, 
                totalCorrectReviews: isCorrect ? 1 : 0 
            },
        });

        let { easeFactor, interval, repetitions } = progress;

        if (isCorrect) {
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