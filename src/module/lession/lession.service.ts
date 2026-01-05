
// src/module/lession/lession.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty, Lesson, LessonType } from '@prisma/client';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';
import { CreateLessonContainerDto } from './dto/create-lesson.dto';
import { QuestionSetService } from '../question-set/question-set.service';

@Injectable()
export class LessionService {
  constructor(
    private prisma: PrismaService,
    private questionSet: QuestionSetService,
  ) {}

  async createLessonContainer(dto: CreateLessonContainerDto): Promise<Lesson> {
    console.log(`Attempting to create new Lesson container: ${dto.title}`);

    const newLesson = await this.prisma.lesson.create({
      data: {
        title: dto.title,
        type: dto.type,
        provider: dto.provider,
        isPublished: false,
      },
    });

    console.log(`Lesson container created with ID: ${newLesson.id}`);
    return newLesson;
  }

  /**
   * NEW VERSION: Uses PracticeSession instead of UserLessonProgress
   */
  async findNextLessonForUser(userId: string, type: LessonType): Promise<Lesson> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    const level: Difficulty = user.currentLevel;

    // 1. Get all completed lesson IDs for this user (from PracticeSession)
    const completedSessions = await this.prisma.practiceSession.findMany({
      where: { userId, lessonId: { not: null } },
      select: { lessonId: true },
      distinct: ['lessonId'],
    });

    const completedLessonIds = completedSessions.map(s => s.lessonId!);

    // 2. Find next NEW lesson (not completed)
    let nextLesson = await this.prisma.lesson.findFirst({
      where: {
        type: type,
        difficulty: level,
        isPublished: true,
        id: { notIn: completedLessonIds.length > 0 ? completedLessonIds : undefined },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 3. If no new lessons → find lowest accuracy for review
    if (!nextLesson) {
      console.log(`No new lessons — finding lowest accuracy for review`);

      const lowestAccuracySession = await this.prisma.practiceSession.findFirst({
        where: {
          userId,
          lesson: {
            type: type,
            difficulty: level,
            isPublished: true,
          },
        },
        orderBy: { accuracy: 'asc' }, // lowest first
        include: { lesson: true },
      });

      if (lowestAccuracySession?.lesson) {
        nextLesson = lowestAccuracySession.lesson;
      }
    }

    // 4. If still nothing → user has mastered everything
    if (!nextLesson) {
      throw new NotFoundException(
        `You have mastered all available ${level} ${type} content! Ready for the next level?`,
      );
    }

    return nextLesson;
  }

  async findAllLessons(query: GetLessonsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      ...(query.type && { type: query.type }),
      ...(query.level && { difficulty: query.level }),
      ...(query.search && {
        title: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const total = await this.prisma.lesson.count({ where: whereClause });

    const lessons = await this.prisma.lesson.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        questionSets: {
          select: { id: true, subCategoryType: true },
        },
      },
    });

    return {
      data: lessons,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSingleLesson(lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { questionSets: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
    }

    return lesson;
  }

  async updatePublishedStatus(lessonId: number, dto: UpdateLessonStatusDto): Promise<Lesson> {
    if (dto.isPublished === true) {
      const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { type: true } });
      if (!lesson) throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);

      const required = this.questionSet.getRequiredSubCategories(lesson.type);
      const existing = await this.prisma.questionSet.count({ where: { lessonId } });

      if (existing !== required.length) {
        throw new NotFoundException(`Lesson incomplete: ${existing}/${required.length} sections`);
      }
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { isPublished: dto.isPublished },
    });
  }

  async deleteLesson(lessonId: number): Promise<void> {
    await this.prisma.$transaction([
      // Delete practice sessions first
      this.prisma.practiceSession.deleteMany({ where: { lessonId } }),
      // Delete question sets
      this.prisma.questionSet.deleteMany({ where: { lessonId } }),
      // Delete lesson
      this.prisma.lesson.delete({ where: { id: lessonId } }),
    ]);

    console.log(`Lesson ${lessonId} and all data deleted.`);
  }
}