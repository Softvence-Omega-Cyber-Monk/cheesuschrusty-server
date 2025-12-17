// import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
// import { PrismaService } from 'src/common/service/prisma/prisma.service';
// import { FlashcardOverviewResponseDto } from './dto/flashcard.overview.dto';
// import { GradeCardDto, StartSessionDto } from './dto/flashcard.grading.dto';
// import { GradeCardResponseDto, StartSessionResponseDto } from './dto/flashcard.response.dto';
// import { CreateCardDto, CreateCategoryDto, UpdateCardDto } from './dto/create-flashcard.dto';
// import { PracticeSessionService } from '../practice-session/practice-session.service';

// const SESSION_LIMIT = 12;

// interface SessionData {
//     remainingCardIds: number[];
//     correctCount: number;
//     incorrectCount: number;
// }

// @Injectable()
// export class FlashcardService {
//     private readonly logger = new Logger(FlashcardService.name);
//     private readonly MASTERY_THRESHOLD = 5;

//     constructor(private prisma: PrismaService,
//                 private practiceSessionService: PracticeSessionService
//     ) {}

//     // ====================================================================
//     // ------------------------- CONTENT MANAGEMENT -----------------
//     // ====================================================================

//     async createCategory(dto: CreateCategoryDto) {
//         this.logger.log(`Creating new category: ${dto.title}`);
//         return this.prisma.flashcardCategory.create({ data: { title: dto.title } });
//     }

//     async createCard(dto: CreateCardDto) {
//         const categoryExists = await this.prisma.flashcardCategory.findUnique({
//             where: { id: dto.categoryId },
//         });
//         if (!categoryExists) throw new NotFoundException(`Category with ID ${dto.categoryId} not found.`);

//         this.logger.log(`Creating new card in category ${dto.categoryId}: ${dto.frontText}`);
//         return this.prisma.card.create({
//             data: { frontText: dto.frontText, backText: dto.backText, categoryId: dto.categoryId },
//         });
//     }

//     async getCategoryWithCards(categoryId: number) {
//         const category = await this.prisma.flashcardCategory.findUnique({
//             where: { id: categoryId },
//             include: { cards: true },
//         });
//         if (!category) throw new NotFoundException(`Category with ID ${categoryId} not found.`);
//         return category;
//     }

//     async updateCard(cardId: number, dto: UpdateCardDto) {
//         const existing = await this.prisma.card.findUnique({ where: { id: cardId } });
//         if (!existing) throw new NotFoundException(`Card with ID ${cardId} not found.`);

//         return this.prisma.card.update({
//             where: { id: cardId },
//             data: {
//                 frontText: dto.frontText ?? existing.frontText,
//                 backText: dto.backText ?? existing.backText,
//             },
//         });
//     }

//     async deleteCard(cardId: number) {
//         const existing = await this.prisma.card.findUnique({ where: { id: cardId } });
//         if (!existing) throw new NotFoundException(`Card with ID ${cardId} not found.`);

//         await this.prisma.flashcardProgress.deleteMany({ where: { cardId } });
//         await this.prisma.card.delete({ where: { id: cardId } });
//         return { message: 'Card deleted successfully.' };
//     }

//     async deleteCategory(categoryId: number) {
//         const existing = await this.prisma.flashcardCategory.findUnique({ where: { id: categoryId } });
//         if (!existing) throw new NotFoundException(`Category with ID ${categoryId} not found.`);

//         const cards = await this.prisma.card.findMany({ where: { categoryId } });
//         for (const card of cards) {
//             await this.prisma.flashcardProgress.deleteMany({ where: { cardId: card.id } });
//         }
//         await this.prisma.card.deleteMany({ where: { categoryId } });
//         await this.prisma.flashcardCategory.delete({ where: { id: categoryId } });

//         return { message: 'Category and all its cards deleted successfully.' };
//     }

//     async bulkUploadCards(categoryId: number, cards: CreateCardDto[]) {
//         const category = await this.prisma.flashcardCategory.findUnique({ where: { id: categoryId } });
//         if (!category) throw new NotFoundException(`Category with ID ${categoryId} not found.`);
//         if (!cards.length) throw new BadRequestException('No cards provided for bulk upload.');

//         const formattedCards = cards.map(card => ({
//             frontText: card.frontText,
//             backText: card.backText,
//             categoryId,
//         }));

//         await this.prisma.card.createMany({ data: formattedCards });
//         return { message: `${cards.length} cards uploaded successfully.` };
//     }
  
  
  
// async getAllCategories() {
//   return this.prisma.flashcardCategory.findMany({
//     orderBy: { createdAt: 'desc' },
//     select: {
//       id: true,
//       title: true,
//       createdAt: true,
//       difficulty:true,
//       _count: {
//         select: {
//           cards: true,
//         },
//       },
//     },
//   });
// }


//     // ====================================================================
//     // --------------------------- TIME HELPER ---------------------------
//     // ====================================================================

//     private formatTime(seconds: number): string {
//         const m = Math.floor(seconds / 60).toString().padStart(2, '0');
//         const s = (seconds % 60).toString().padStart(2, '0');
//         return `${m}:${s}`;
//     }

//     // ====================================================================
//     // ------------------------- STUDY FLOW -------------------------
//     // ====================================================================

//     async getDashboardOverview(userId: string): Promise<FlashcardOverviewResponseDto> {
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         const categories = await this.prisma.flashcardCategory.findMany({
//             include: { cards: { select: { id: true } } },
//             orderBy: { id: 'asc' },
//         });

//         const allUserProgress = await this.prisma.flashcardProgress.findMany({ where: { userId } });

//         const activeSessions = await this.prisma.activeFlashcardSession.findMany({
//             where: { userId, status: { in: ['ACTIVE', 'PAUSED'] } },
//         });

//         const categorySummaries = categories.map(category => {
//             const totalCards = category.cards.length;
//             const categoryCardIds = new Set(category.cards.map(c => c.id));
//             const categoryProgress = allUserProgress.filter(p => categoryCardIds.has(p.cardId));

//             const dueCount = categoryProgress.filter(p => p.nextReview && p.nextReview <= today).length;
//             const masteredCount = categoryProgress.filter(p => p.repetitions >= this.MASTERY_THRESHOLD).length;
//             const isActiveSession = activeSessions.some(s => s.categoryName === category.title);

//             return {
//                 categoryId: category.id,
//                 categoryTitle: category.title,
//                 total: totalCards,
//                 due: dueCount,
//                 mastered: masteredCount,
//                 isActiveSession,
//             };
//         });

//         const lifetimeStats = await this.calculateLifetimeMetrics(userId);

//         return {
//             categories: categorySummaries,
//             lifetimeMetrics: lifetimeStats,
//         };
//     }

//     private async calculateLifetimeMetrics(userId: string) {
//         const sessionsCompleted = await this.prisma.activeFlashcardSession.count({
//             where: { userId, status: 'FINISHED' },
//         });

//         const progressAgg = await this.prisma.flashcardProgress.aggregate({
//             where: { userId },
//             _sum: { totalReviews: true, totalCorrectReviews: true },
//         });

//         const totalCardsStudied = progressAgg._sum.totalReviews || 0;
//         const totalCorrect = progressAgg._sum.totalCorrectReviews || 0;
//         const avg = totalCardsStudied > 0 ? (totalCorrect / totalCardsStudied) * 100 : 0;

//         return {
//             sessionsCompleted,
//             totalCardsStudied,
//             averageScorePercentage: parseFloat(avg.toFixed(1)),
//         };
//     }

//     // ====================================================================
//     // --------------------------- START / RESUME ---------------------------
//     // ====================================================================

//     async startSession(userId: string, dto: StartSessionDto): Promise<StartSessionResponseDto> {
//         const activeSession = await this.prisma.activeFlashcardSession.findFirst({
//             where: { userId, status: { in: ['ACTIVE', 'PAUSED'] } },
//             orderBy: { createdAt: 'desc' },
//         });

//         const category = await this.prisma.flashcardCategory.findUnique({
//             where: { id: dto.categoryId },
//             include: { cards: { select: { id: true, frontText: true, backText: true } } },
//         });

//         if (!category) throw new NotFoundException(`Category ${dto.categoryId} not found`);

//         // RESUME EXISTING SESSION
//         if (activeSession && activeSession.categoryName === category.title) {
//             const sessionData = activeSession.sessionData as unknown as SessionData;
//             const nextCardId = sessionData.remainingCardIds[0];

//             if (!nextCardId) {
//                 await this.prisma.activeFlashcardSession.update({
//                     where: { id: activeSession.id },
//                     data: { status: 'FINISHED', dateCompleted: new Date() },
//                 });
//                 throw new NotFoundException('Session queue empty');
//             }

//             const nextCard = category.cards.find(c => c.id === nextCardId);
//             if (!nextCard) throw new NotFoundException('Next card not found');

//             const progress = await this.prisma.flashcardProgress.findUnique({
//                 where: { userId_cardId: { userId, cardId: nextCardId } },
//                 select: { interval: true },
//             });

//             return {
//                 sessionId: activeSession.id,
//                 status: 'ACTIVE',
//                 cardsRemaining: sessionData.remainingCardIds.length,
//                 scores: { correctCount: sessionData.correctCount, incorrectCount: sessionData.incorrectCount },
//                 currentCard: {
//                     cardId: nextCard.id,
//                     frontText: nextCard.frontText,
//                     backText: nextCard.backText,
//                     currentInterval: progress?.interval || 0,
//                 },
//                 totalTimeSeconds: activeSession.totalTimeSeconds,
//                 formattedTime: this.formatTime(activeSession.totalTimeSeconds),
//             };
//         }

//         // NEW SESSION
//         const categoryCardIds = category.cards.map(c => c.id);
//         let cardIdsForSession: number[] = [];

//         const dueProgress = await this.prisma.flashcardProgress.findMany({
//             where: { userId, cardId: { in: categoryCardIds }, nextReview: { lte: new Date() } },
//             orderBy: { nextReview: 'asc' },
//             take: SESSION_LIMIT,
//         });
//         cardIdsForSession = dueProgress.map(p => p.cardId);

//         if (cardIdsForSession.length === 0) {
//             const studied = await this.prisma.flashcardProgress.findMany({
//                 where: { userId, cardId: { in: categoryCardIds } },
//                 select: { cardId: true },
//             });
//             const studiedIds = new Set(studied.map(p => p.cardId));
//             const newIds = categoryCardIds.filter(id => !studiedIds.has(id)).slice(0, SESSION_LIMIT);
//             cardIdsForSession = newIds.length > 0 ? newIds : (
//                 await this.prisma.flashcardProgress.findMany({
//                     where: { userId, cardId: { in: categoryCardIds } },
//                     orderBy: { nextReview: 'asc' },
//                     take: SESSION_LIMIT,
//                 })
//             ).map(p => p.cardId);
//         }

//         if (cardIdsForSession.length === 0) {
//             throw new NotFoundException('No cards available to study');
//         }

//         const initialSessionData: SessionData = {
//             remainingCardIds: cardIdsForSession,
//             correctCount: 0,
//             incorrectCount: 0,
//         };

//         const newSession = await this.prisma.activeFlashcardSession.create({
//             data: {
//                 userId,
//                 categoryName: category.title,
//                 sessionData: initialSessionData as any,
//                 status: 'ACTIVE',
//                 totalTimeSeconds: 0,
//             },
//         });

//         const firstCard = category.cards.find(c => c.id === cardIdsForSession[0]);
//         if (!firstCard) throw new NotFoundException('First card not found');

//         const progress = await this.prisma.flashcardProgress.findUnique({
//             where: { userId_cardId: { userId, cardId: firstCard.id } },
//             select: { interval: true },
//         });

//         return {
//             sessionId: newSession.id,
//             status: 'ACTIVE',
//             cardsRemaining: cardIdsForSession.length,
//             scores: { correctCount: 0, incorrectCount: 0 },
//             currentCard: {
//                 cardId: firstCard.id,
//                 frontText: firstCard.frontText,
//                 backText: firstCard.backText,
//                 currentInterval: progress?.interval || 0,
//             },
//             totalTimeSeconds: 0,
//             formattedTime: '00:00',
//         };
//     }

//     // ====================================================================
//     // ------------------------------- PAUSE (SAVE TIME) ------------------
//     // ====================================================================

//     async pauseSession(userId: string, sessionId: string, currentTimeSeconds: number): Promise<void> {
//         await this.prisma.activeFlashcardSession.update({
//             where: { id: sessionId, userId },
//             data: {
//                 status: 'PAUSED',
//                 totalTimeSeconds: currentTimeSeconds,  // ← Frontend sends this
//             },
//         });

//         this.logger.log(`Session ${sessionId} paused – saved time: ${currentTimeSeconds}s`);
//     }

//     // ====================================================================
//     // ------------------------------- GRADE (NO TIME MATH) ---------------
//     // ====================================================================

//     async gradeCard(userId: string, dto: GradeCardDto): Promise<GradeCardResponseDto> {
//         const session = await this.prisma.activeFlashcardSession.findUnique({
//             where: { id: dto.sessionId, userId },
//         });

//         if (!session || session.status === 'FINISHED') {
//             throw new NotFoundException('Session not found or already finished');
//         }

//         const sessionData = session.sessionData as unknown as SessionData;
//         if (sessionData.remainingCardIds[0] !== dto.cardId) {
//             throw new BadRequestException('Wrong card order');
//         }

//         let { remainingCardIds, correctCount, incorrectCount } = sessionData;
//         const isCorrect = dto.grade >= 2;
//         if (isCorrect) correctCount++; else incorrectCount++;

//         remainingCardIds.shift();
//         if (!isCorrect) remainingCardIds.push(dto.cardId);

//         const sessionFinished = remainingCardIds.length === 0;

//         await this.applySrsLogic(userId, dto.cardId, dto.grade);

//         if (sessionFinished) {
//             await this.prisma.activeFlashcardSession.update({
//                 where: { id: dto.sessionId },
//                 data: {
//                     sessionData: { remainingCardIds, correctCount, incorrectCount } as any,
//                     status: 'FINISHED',
//                     dateCompleted: new Date(),
//                     totalTimeSeconds: dto.currentTimeSeconds ?? session.totalTimeSeconds,
//                     // totalTimeSeconds is NOT updated here — frontend will send final time on pause/finish
//                 },
//             });

// // 2. Now save to PracticeSession with accurate time
//     const total = correctCount + incorrectCount;
//     const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
//     const xpEarned = Math.round(accuracy / 10);

//     const finalDuration = dto.currentTimeSeconds ?? session.totalTimeSeconds;

//     await this.practiceSessionService.createSession({
//       userId,
//       skillArea: 'reading',
//       accuracy,
//       durationSeconds: finalDuration,
//       xpEarned,
//     });




//         } else {
//             await this.prisma.activeFlashcardSession.update({
//                 where: { id: dto.sessionId },
//                 data: {
//                     sessionData: { remainingCardIds, correctCount, incorrectCount } as any,
//                 },
//             });
//         }

//         const response: GradeCardResponseDto = {
//             scores: { correctCount, incorrectCount },
//             sessionFinished,
//             currentCard: null,
//             totalTimeSeconds: session.totalTimeSeconds,
//             formattedTime: this.formatTime(session.totalTimeSeconds),
//         };

//         if (!sessionFinished) {
//             const nextId = remainingCardIds[0];
//             const nextCard = await this.prisma.card.findUnique({ where: { id: nextId } });
//             const prog = await this.prisma.flashcardProgress.findUnique({
//                 where: { userId_cardId: { userId, cardId: nextId } },
//                 select: { interval: true },
//             });

//             if (nextCard) {
//                 response.currentCard = {
//                     cardId: nextCard.id,
//                     frontText: nextCard.frontText,
//                     backText: nextCard.backText,
//                     currentInterval: prog?.interval || 0,
//                 };
//             }
//         }

//         return response;
//     }

//     // ====================================================================
//     // ------------------------------- SRS LOGIC ---------------------------
//     // ====================================================================

//     private async applySrsLogic(userId: string, cardId: number, grade: number): Promise<void> {
//         const isCorrect = grade >= 2;

//         const progress = await this.prisma.flashcardProgress.upsert({
//             where: { userId_cardId: { userId, cardId } },
//             update: {
//                 totalReviews: { increment: 1 },
//                 totalCorrectReviews: isCorrect ? { increment: 1 } : undefined,
//             },
//             create: {
//                 userId, cardId,
//                 totalReviews: 1,
//                 totalCorrectReviews: isCorrect ? 1 : 0,
//             },
//         });

//         let { easeFactor, interval, repetitions } = progress;

//         if (isCorrect) {
//             repetitions += 1;
//             if (repetitions === 1) interval = 1;
//             else if (repetitions === 2) interval = 6;
//             else interval = Math.round(interval * easeFactor);

//             easeFactor += (0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02));
//             easeFactor = Math.max(1.3, easeFactor);
//         } else {
//             repetitions = 0;
//             interval = 1;
//         }

//         const nextReview = new Date();
//         nextReview.setDate(nextReview.getDate() + interval);

//         await this.prisma.flashcardProgress.update({
//             where: { id: progress.id },
//             data: { easeFactor, interval, repetitions, nextReview },
//         });
//     }
// }












// src/module/flashcard/flashcard.service.ts
import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { FlashcardOverviewResponseDto } from './dto/flashcard.overview.dto';
import { GradeCardDto, StartSessionDto } from './dto/flashcard.grading.dto';
import { GradeCardResponseDto, StartSessionResponseDto } from './dto/flashcard.response.dto';
import { CreateCardDto, CreateCategoryDto, UpdateCardDto } from './dto/create-flashcard.dto';
import { PracticeSessionService } from '../practice-session/practice-session.service';

const SESSION_LIMIT = 12;

interface SessionData {
  remainingCardIds: number[];
  correctCount: number;
  incorrectCount: number;
}

@Injectable()
export class FlashcardService {
  private readonly logger = new Logger(FlashcardService.name);
  private readonly MASTERY_THRESHOLD = 5;

  constructor(
    private prisma: PrismaService,
    private practiceSessionService: PracticeSessionService,
  ) {}

  // ====================================================================
  // ------------------------- CONTENT MANAGEMENT -----------------
  // ====================================================================

  async createCategory(dto: CreateCategoryDto) {
    this.logger.log(`Creating new category: ${dto.title}`);
    return this.prisma.flashcardCategory.create({ data: { title: dto.title } });
  }

  async createCard(dto: CreateCardDto) {
    const categoryExists = await this.prisma.flashcardCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!categoryExists) throw new NotFoundException(`Category with ID ${dto.categoryId} not found.`);

    this.logger.log(`Creating new card in category ${dto.categoryId}: ${dto.frontText}`);
    return this.prisma.card.create({
      data: { frontText: dto.frontText, backText: dto.backText, categoryId: dto.categoryId },
    });
  }

  async getCategoryWithCards(categoryId: number) {
    const category = await this.prisma.flashcardCategory.findUnique({
      where: { id: categoryId },
      include: { cards: true },
    });
    if (!category) throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    return category;
  }

  async updateCard(cardId: number, dto: UpdateCardDto) {
    const existing = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!existing) throw new NotFoundException(`Card with ID ${cardId} not found.`);

    return this.prisma.card.update({
      where: { id: cardId },
      data: {
        frontText: dto.frontText ?? existing.frontText,
        backText: dto.backText ?? existing.backText,
      },
    });
  }

  async deleteCard(cardId: number) {
    const existing = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!existing) throw new NotFoundException(`Card with ID ${cardId} not found.`);

    await this.prisma.flashcardProgress.deleteMany({ where: { cardId } });
    await this.prisma.card.delete({ where: { id: cardId } });
    return { message: 'Card deleted successfully.' };
  }

  async deleteCategory(categoryId: number) {
    const existing = await this.prisma.flashcardCategory.findUnique({ where: { id: categoryId } });
    if (!existing) throw new NotFoundException(`Category with ID ${categoryId} not found.`);

    const cards = await this.prisma.card.findMany({ where: { categoryId } });
    for (const card of cards) {
      await this.prisma.flashcardProgress.deleteMany({ where: { cardId: card.id } });
    }
    await this.prisma.card.deleteMany({ where: { categoryId } });
    await this.prisma.flashcardCategory.delete({ where: { id: categoryId } });

    return { message: 'Category and all its cards deleted successfully.' };
  }

  async bulkUploadCards(categoryId: number, cards: CreateCardDto[]) {
    const category = await this.prisma.flashcardCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException(`Category with ID ${categoryId} not found.`);
    if (!cards.length) throw new BadRequestException('No cards provided for bulk upload.');

    const formattedCards = cards.map(card => ({
      frontText: card.frontText,
      backText: card.backText,
      categoryId,
    }));

    await this.prisma.card.createMany({ data: formattedCards });
    return { message: `${cards.length} cards uploaded successfully.` };
  }

  async getAllCategories() {
    return this.prisma.flashcardCategory.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        difficulty: true,
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });
  }

  // ====================================================================
  // --------------------------- TIME HELPER ---------------------------
  // ====================================================================

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ====================================================================
  // ------------------------- STUDY FLOW -------------------------
  // ====================================================================

  async getDashboardOverview(userId: string): Promise<FlashcardOverviewResponseDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const categories = await this.prisma.flashcardCategory.findMany({
      include: { cards: { select: { id: true } } },
      orderBy: { id: 'asc' },
    });

    const allUserProgress = await this.prisma.flashcardProgress.findMany({ where: { userId } });

    const activeSessions = await this.prisma.activeFlashcardSession.findMany({
      where: { userId, status: { in: ['ACTIVE', 'PAUSED'] } },
    });

    const categorySummaries = categories.map(category => {
      const totalCards = category.cards.length;
      const categoryCardIds = new Set(category.cards.map(c => c.id));
      const categoryProgress = allUserProgress.filter(p => categoryCardIds.has(p.cardId));

      const dueCount = categoryProgress.filter(p => p.nextReview && p.nextReview <= today).length;
      const masteredCount = categoryProgress.filter(p => p.repetitions >= this.MASTERY_THRESHOLD).length;
      const isActiveSession = activeSessions.some(s => s.categoryName === category.title);

      return {
        categoryId: category.id,
        categoryTitle: category.title,
        total: totalCards,
        due: dueCount,
        mastered: masteredCount,
        isActiveSession,
      };
    });

    const lifetimeStats = await this.calculateLifetimeMetrics(userId);

    return {
      categories: categorySummaries,
      lifetimeMetrics: lifetimeStats,
    };
  }

  private async calculateLifetimeMetrics(userId: string) {
    const sessionsCompleted = await this.prisma.activeFlashcardSession.count({
      where: { userId, status: 'FINISHED' },
    });

    const progressAgg = await this.prisma.flashcardProgress.aggregate({
      where: { userId },
      _sum: { totalReviews: true, totalCorrectReviews: true },
    });

    const totalCardsStudied = progressAgg._sum.totalReviews || 0;
    const totalCorrect = progressAgg._sum.totalCorrectReviews || 0;
    const avg = totalCardsStudied > 0 ? (totalCorrect / totalCardsStudied) * 100 : 0;

    return {
      sessionsCompleted,
      totalCardsStudied,
      averageScorePercentage: parseFloat(avg.toFixed(1)),
    };
  }

  // ====================================================================
  // --------------------------- START / RESUME ---------------------------
  // ====================================================================

  async startSession(userId: string, dto: StartSessionDto): Promise<StartSessionResponseDto> {
    const activeSession = await this.prisma.activeFlashcardSession.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: { createdAt: 'desc' },
    });

    const category = await this.prisma.flashcardCategory.findUnique({
      where: { id: dto.categoryId },
      include: { cards: { select: { id: true, frontText: true, backText: true } } },
    });

    if (!category) throw new NotFoundException(`Category ${dto.categoryId} not found`);

    // RESUME EXISTING SESSION
    if (activeSession && activeSession.categoryName === category.title) {
      const sessionData = activeSession.sessionData as unknown as SessionData;
      const nextCardId = sessionData.remainingCardIds[0];

      if (!nextCardId) {
        await this.prisma.activeFlashcardSession.update({
          where: { id: activeSession.id },
          data: { status: 'FINISHED', dateCompleted: new Date() },
        });
        throw new NotFoundException('Session queue empty');
      }

      const nextCard = category.cards.find(c => c.id === nextCardId);
      if (!nextCard) throw new NotFoundException('Next card not found');

      const progress = await this.prisma.flashcardProgress.findUnique({
        where: { userId_cardId: { userId, cardId: nextCardId } },
        select: { interval: true },
      });

      return {
        sessionId: activeSession.id,
        status: 'ACTIVE',
        cardsRemaining: sessionData.remainingCardIds.length,
        scores: { correctCount: sessionData.correctCount, incorrectCount: sessionData.incorrectCount },
        currentCard: {
          cardId: nextCard.id,
          frontText: nextCard.frontText,
          backText: nextCard.backText,
          currentInterval: progress?.interval || 0,
        },
        totalTimeSeconds: activeSession.totalTimeSeconds,
        formattedTime: this.formatTime(activeSession.totalTimeSeconds),
      };
    }

    // NEW SESSION
    const categoryCardIds = category.cards.map(c => c.id);
    let cardIdsForSession: number[] = [];

    const dueProgress = await this.prisma.flashcardProgress.findMany({
      where: { userId, cardId: { in: categoryCardIds }, nextReview: { lte: new Date() } },
      orderBy: { nextReview: 'asc' },
      take: SESSION_LIMIT,
    });
    cardIdsForSession = dueProgress.map(p => p.cardId);

    if (cardIdsForSession.length < SESSION_LIMIT) {
      const studied = await this.prisma.flashcardProgress.findMany({
        where: { userId, cardId: { in: categoryCardIds } },
        select: { cardId: true },
      });
      const studiedIds = new Set(studied.map(p => p.cardId));
      const newIds = categoryCardIds.filter(id => !studiedIds.has(id)).slice(0, SESSION_LIMIT - cardIdsForSession.length);
      cardIdsForSession = [...cardIdsForSession, ...newIds];
    }

    if (cardIdsForSession.length === 0) {
      throw new NotFoundException('No cards available to study');
    }

    const initialSessionData: SessionData = {
      remainingCardIds: cardIdsForSession,
      correctCount: 0,
      incorrectCount: 0,
    };

    const newSession = await this.prisma.activeFlashcardSession.create({
      data: {
        userId,
        categoryName: category.title,
        sessionData: initialSessionData as any,
        status: 'ACTIVE',
        totalTimeSeconds: 0,
      },
    });

    const firstCard = category.cards.find(c => c.id === cardIdsForSession[0]);
    if (!firstCard) throw new NotFoundException('First card not found');

    const progress = await this.prisma.flashcardProgress.findUnique({
      where: { userId_cardId: { userId, cardId: firstCard.id } },
      select: { interval: true },
    });

    return {
      sessionId: newSession.id,
      status: 'ACTIVE',
      cardsRemaining: cardIdsForSession.length,
      scores: { correctCount: 0, incorrectCount: 0 },
      currentCard: {
        cardId: firstCard.id,
        frontText: firstCard.frontText,
        backText: firstCard.backText,
        currentInterval: progress?.interval || 0,
      },
      totalTimeSeconds: 0,
      formattedTime: '00:00',
    };
  }

  // ====================================================================
  // ------------------------------- PAUSE (SAVE TIME) ------------------
  // ====================================================================

  async pauseSession(userId: string, sessionId: string, currentTimeSeconds: number): Promise<void> {
    await this.prisma.activeFlashcardSession.update({
      where: { id: sessionId, userId },
      data: {
        status: 'PAUSED',
        totalTimeSeconds: currentTimeSeconds,
      },
    });

    this.logger.log(`Session ${sessionId} paused – saved time: ${currentTimeSeconds}s`);
  }

  // ====================================================================
  // ------------------------------- GRADE (NO TIME MATH) ---------------
  // ====================================================================

  async gradeCard(userId: string, dto: GradeCardDto): Promise<GradeCardResponseDto> {
    const session = await this.prisma.activeFlashcardSession.findUnique({
      where: { id: dto.sessionId, userId },
    });

    if (!session || session.status === 'FINISHED') {
      throw new NotFoundException('Session not found or already finished');
    }

    const sessionData = session.sessionData as unknown as SessionData;
    if (sessionData.remainingCardIds[0] !== dto.cardId) {
      throw new BadRequestException('Wrong card order');
    }

    let { remainingCardIds, correctCount, incorrectCount } = sessionData;
    const isCorrect = dto.grade >= 2;
    if (isCorrect) correctCount++;
    else incorrectCount++;

    // Remove current card from queue — DO NOT add back if wrong
    remainingCardIds.shift();

    const sessionFinished = remainingCardIds.length === 0;

    await this.applySrsLogic(userId, dto.cardId, dto.grade);

    if (sessionFinished) {
      await this.prisma.activeFlashcardSession.update({
        where: { id: dto.sessionId },
        data: {
          sessionData: { remainingCardIds, correctCount, incorrectCount } as any,
          status: 'FINISHED',
          dateCompleted: new Date(),
          totalTimeSeconds: dto.currentTimeSeconds ?? session.totalTimeSeconds,
        },
      });

      // Save to PracticeSession
      const total = correctCount + incorrectCount;
      const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
      const xpEarned = Math.round(accuracy / 10);
      const finalDuration = dto.currentTimeSeconds ?? session.totalTimeSeconds;

      await this.practiceSessionService.createSession({
        userId,
        skillArea: 'reading',
        accuracy,
        durationSeconds: finalDuration,
        xpEarned,
      });
    } else {
      await this.prisma.activeFlashcardSession.update({
        where: { id: dto.sessionId },
        data: {
          sessionData: { remainingCardIds, correctCount, incorrectCount } as any,
        },
      });
    }

    const response: GradeCardResponseDto = {
      scores: { correctCount, incorrectCount },
      sessionFinished,
      currentCard: null,
      totalTimeSeconds: session.totalTimeSeconds,
      formattedTime: this.formatTime(session.totalTimeSeconds),
    };

    if (!sessionFinished) {
      const nextId = remainingCardIds[0];
      const nextCard = await this.prisma.card.findUnique({ where: { id: nextId } });
      const prog = await this.prisma.flashcardProgress.findUnique({
        where: { userId_cardId: { userId, cardId: nextId } },
        select: { interval: true },
      });

      if (nextCard) {
        response.currentCard = {
          cardId: nextCard.id,
          frontText: nextCard.frontText,
          backText: nextCard.backText,
          currentInterval: prog?.interval || 0,
        };
      }
    }

    return response;
  }

  // ====================================================================
  // ------------------------------- SRS LOGIC ---------------------------
  // ====================================================================

  private async applySrsLogic(userId: string, cardId: number, grade: number): Promise<void> {
    const isCorrect = grade >= 2;

    const progress = await this.prisma.flashcardProgress.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: {
        totalReviews: { increment: 1 },
        totalCorrectReviews: isCorrect ? { increment: 1 } : undefined,
      },
      create: {
        userId,
        cardId,
        totalReviews: 1,
        totalCorrectReviews: isCorrect ? 1 : 0,
      },
    });

    let { easeFactor, interval, repetitions } = progress;

    if (isCorrect) {
      repetitions += 1;
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 6;
      else interval = Math.round(interval * easeFactor);

      easeFactor += (0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02));
      easeFactor = Math.max(1.3, easeFactor);
    } else {
      repetitions = 0;
      interval = 1;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    await this.prisma.flashcardProgress.update({
      where: { id: progress.id },
      data: { easeFactor, interval, repetitions, nextReview },
    });
  }
}