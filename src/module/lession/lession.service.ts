// src/module/lession/lession.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty, Lesson, LessonType } from '@prisma/client';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';
import { CreateLessonContainerDto } from './dto/create-lesson.dto';

@Injectable()
export class LessionService {
  constructor(private prisma: PrismaService) {}

  async createLessonContainer(dto: CreateLessonContainerDto): Promise<Lesson> {
    console.log(`Attempting to create new Lesson container`);

    const newLesson = await this.prisma.lesson.create({
      data: {
        provider: dto.provider,
        skill: dto.skill,
        task_id: dto.task_id,
        domain: dto.domain,
        level: dto.level,
        target_language: dto.target_language,
        isPublished: false,
      },
    });

    console.log(`Lesson container created with ID: ${newLesson.id}`);
    return newLesson;
  }

  async findNextLessonForUser(userId: string, type: LessonType): Promise<Lesson> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    const level: Difficulty = user.currentLevel;
    const levelString = level.toString();

    // 1. Get all completed lesson IDs
    const completedSessions = await this.prisma.practiceSession.findMany({
      where: { userId, lessonId: { not: null } },
      select: { lessonId: true },
      distinct: ['lessonId'],
    });

    const completedLessonIds = completedSessions.map((s: any) => s.lessonId!);

    // 2. Find next NEW lesson
    let nextLesson = await this.prisma.lesson.findFirst({
      where: {
        skill: type,
        level: levelString,
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
            skill: type,
            level: levelString,
            isPublished: true,
          },
        },
        orderBy: { accuracy: 'asc' },
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
      ...(query.type && { skill: query.type }),
      ...(query.level && { level: query.level }),
      ...(query.search && {
        task_id: { contains: query.search, mode: 'insensitive' },
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
          select: { id: true },
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