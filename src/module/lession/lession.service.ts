// src/module/lession/lession.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty, LessonType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';
import { CreateLessonContainerDto } from './dto/create-lesson.dto';
import { CreateLessonBatchDto } from './dto/create-lesson-batch.dto';

type LessonRecord = Prisma.LessonGetPayload<Record<string, never>>;
type LessonWithQuestionSetIds = Prisma.LessonGetPayload<{
  include: { questionSets: { select: { id: true } } };
}>;
type LessonWithQuestionSets = Prisma.LessonGetPayload<{
  include: { questionSets: true };
}>;
type GroupedLessonTask = {
  tasks_id: string | null;
  topic: string | null;
  schema: string | null;
  domains: {
    name: string;
    is_pro: boolean;
  }[];
};
type GroupedLessonPractice = {
  skill: string | null;
  tasks: GroupedLessonTask[];
};
type GroupedLessonLevel = {
  level_id: string | null;
  level_title: string | null;
  is_pro: boolean;
  practises: GroupedLessonPractice[];
};

@Injectable()
export class LessionService {
  constructor(private prisma: PrismaService) {}

  private getLevelCandidates(level?: string): string[] {
    const normalizedLevel = level?.trim();

    if (!normalizedLevel) {
      return [];
    }

    return [
      ...new Set([
        normalizedLevel,
        normalizedLevel.toUpperCase(),
        normalizedLevel.toLowerCase(),
      ]),
    ];
  }

  private getDomainFilter(
    domain?: string,
  ): Prisma.StringNullableFilter | undefined {
    const normalizedDomain = domain?.trim();

    if (!normalizedDomain) {
      return undefined;
    }

    return {
      equals: normalizedDomain,
      mode: 'insensitive',
    };
  }

  private getTaskIdFilter(
    taskId?: string,
  ): Prisma.StringNullableFilter | undefined {
    const normalizedTaskId = taskId?.trim();

    if (!normalizedTaskId) {
      return undefined;
    }

    return {
      equals: normalizedTaskId,
      mode: 'insensitive',
    };
  }

  toAdminLessonResponse(
    lesson: LessonRecord | LessonWithQuestionSetIds | LessonWithQuestionSets,
  ) {
    const questionSets =
      'questionSets' in lesson ? lesson.questionSets : undefined;

    return {
      id: lesson.id,
      provider: lesson.provider,
      LEVEL_ID: lesson.level,
      level_title: lesson.level_title,
      TARGET_LANGUAGE: lesson.target_language,
      SKILL: lesson.skill,
      TASK_ID: lesson.task_id,
      topic: lesson.topic,
      DOMAIN: lesson.domain,
      is_pro: lesson.is_pro,
      schema: lesson.schema_name,
      DIFFICULTY: lesson.difficulty,
      SECTION_TOTAL: lesson.section_total ?? questionSets?.length ?? 0,
      TASK_TIME: lesson.task_time ?? 0,
      NATIVE_LANGUAGE: lesson.native_language,
      TEST_MODE: lesson.test_mode,
      LESSON_TITLE: lesson.lesson_title ?? 'Auto',
      isPublished: lesson.isPublished,
      createdAt: lesson.createdAt,
      ...(questionSets ? { questionSets } : {}),
    };
  }

  toBatchAdminLessonResponse(
    lesson: LessonRecord | LessonWithQuestionSetIds | LessonWithQuestionSets,
  ) {
    return {
      ...this.toAdminLessonResponse(lesson),
      variant_count:
        'variant_count' in lesson ? (lesson.variant_count ?? 1) : 1,
    };
  }

  toBatchAdminLessonListResponse(result: {
    data: LessonWithQuestionSetIds[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }) {
    return {
      data: result.data.map((lesson) =>
        this.toBatchAdminLessonResponse(lesson),
      ),
      meta: result.meta,
    };
  }

  toAdminLessonListResponse(result: {
    data: LessonWithQuestionSetIds[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }) {
    return {
      data: result.data.map((lesson) => this.toAdminLessonResponse(lesson)),
      meta: result.meta,
    };
  }

  async createLessonContainer(
    dto: CreateLessonContainerDto,
  ): Promise<LessonRecord> {
    console.log(`Attempting to create new Lesson container`);

    const newLesson = await this.prisma.lesson.create({
      data: {
        provider: dto.provider,
        skill: dto.SKILL,
        task_id: dto.TASK_ID,
        topic: dto.topic,
        domain: dto.DOMAIN,
        is_pro: dto.is_pro ?? false,
        level: dto.LEVEL_ID,
        level_title: dto.level_title,
        schema_name: dto.schema,
        difficulty: dto.DIFFICULTY,
        section_total: dto.SECTION_TOTAL,
        task_time: dto.TASK_TIME,
        native_language: dto.NATIVE_LANGUAGE,
        test_mode: dto.TEST_MODE,
        lesson_title: dto.LESSON_TITLE,
        target_language: dto.TARGET_LANGUAGE,
        isPublished: false,
      },
    });

    console.log(`Lesson container created with ID: ${newLesson.id}`);
    return newLesson;
  }

  async createLessonBatch(dto: CreateLessonBatchDto): Promise<LessonRecord> {
    console.log(`Attempting to create new Lesson batch container`);

    const lessonBatchData: Prisma.LessonUncheckedCreateInput = {
      provider: dto.provider,
      skill: dto.SKILL,
      task_id: dto.TASK_ID,
      topic: dto.topic,
      domain: dto.DOMAIN,
      is_pro: dto.is_pro ?? false,
      level: dto.LEVEL_ID,
      level_title: dto.level_title,
      schema_name: dto.schema,
      difficulty: dto.DIFFICULTY,
      variant_count: dto.variant_count,
      section_total: dto.SECTION_TOTAL,
      task_time: dto.TASK_TIME,
      native_language: dto.NATIVE_LANGUAGE,
      test_mode: dto.TEST_MODE,
      lesson_title: dto.LESSON_TITLE,
      target_language: dto.TARGET_LANGUAGE,
      isPublished: false,
    };

    const newLessonBatch = await this.prisma.lesson.create({
      data: lessonBatchData,
    });

    console.log(`Lesson batch container created with ID: ${newLessonBatch.id}`);
    return newLessonBatch;
  }

  async findNextLessonForUser(
    userId: string,
    type: LessonType,
  ): Promise<LessonRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    const level: Difficulty = user.currentLevel;
    const levelString = level.toString();

    const completedSessions = await this.prisma.practiceSession.findMany({
      where: { userId, lessonId: { not: null } },
      select: { lessonId: true },
      distinct: ['lessonId'],
    });

    const completedLessonIds = completedSessions.map((s: any) => s.lessonId!);

    let nextLesson = await this.prisma.lesson.findFirst({
      where: {
        skill: type,
        level: levelString,
        isPublished: true,
        id: {
          notIn: completedLessonIds.length > 0 ? completedLessonIds : undefined,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!nextLesson) {
      console.log(`No new lessons – finding lowest accuracy for review`);

      const lowestAccuracySession = await this.prisma.practiceSession.findFirst(
        {
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
        },
      );

      if (lowestAccuracySession?.lesson) {
        nextLesson = lowestAccuracySession.lesson;
      }
    }

    if (!nextLesson) {
      throw new NotFoundException(
        `You have mastered all available ${level} ${type} content! Ready for the next level?`,
      );
    }

    return nextLesson;
  }

  async findNextLessonByTypeAndLevel(
    userId: string,
    type: LessonType,
    level: string,
    domain?: string,
    taskId?: string,
  ): Promise<LessonRecord> {
    const levelCandidates = this.getLevelCandidates(level);
    const domainFilter = this.getDomainFilter(domain);
    const taskIdFilter = this.getTaskIdFilter(taskId);

    const completedSessions = await this.prisma.practiceSession.findMany({
      where: { userId, lessonId: { not: null } },
      select: { lessonId: true },
      distinct: ['lessonId'],
    });

    const completedLessonIds = completedSessions.map((s: any) => s.lessonId!);

    let nextLesson = await this.prisma.lesson.findFirst({
      where: {
        skill: type,
        ...(levelCandidates.length > 0 && { level: { in: levelCandidates } }),
        ...(domainFilter && { domain: domainFilter }),
        ...(taskIdFilter && { task_id: taskIdFilter }),
        isPublished: true,
        id: {
          notIn: completedLessonIds.length > 0 ? completedLessonIds : undefined,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!nextLesson) {
      console.log(
        `No new lessons for ${type} ${level} – finding lowest accuracy for review`,
      );

      const lowestAccuracySession = await this.prisma.practiceSession.findFirst(
        {
          where: {
            userId,
            lesson: {
              skill: type,
              ...(levelCandidates.length > 0 && {
                level: { in: levelCandidates },
              }),
              ...(domainFilter && { domain: domainFilter }),
              ...(taskIdFilter && { task_id: taskIdFilter }),
              isPublished: true,
            },
          },
          orderBy: { accuracy: 'asc' },
          include: { lesson: true },
        },
      );

      if (lowestAccuracySession?.lesson) {
        nextLesson = lowestAccuracySession.lesson;
      }
    }

    if (!nextLesson) {
      throw new NotFoundException(
        `No available ${level.toUpperCase()} ${type} lessons found. Try a different level or type.`,
      );
    }

    return nextLesson;
  }

  async findAllLessons(query: GetLessonsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const levelCandidates = this.getLevelCandidates(query.level);
    const domainFilter = this.getDomainFilter(query.domain);

    const whereClause: any = {
      ...(query.type && { skill: query.type }),
      ...(levelCandidates.length > 0 && { level: { in: levelCandidates } }),
      ...(domainFilter && { domain: domainFilter }),
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

  async findGroupedLessons(
    query: GetLessonsQueryDto,
  ): Promise<GroupedLessonLevel[]> {
    const levelCandidates = this.getLevelCandidates(query.level);
    const domainFilter = this.getDomainFilter(query.domain);

    const whereClause: Prisma.LessonWhereInput = {
      ...(query.type && { skill: query.type }),
      ...(levelCandidates.length > 0 && { level: { in: levelCandidates } }),
      ...(domainFilter && { domain: domainFilter }),
      ...(query.search && {
        task_id: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const lessons = await this.prisma.lesson.findMany({
      where: whereClause,
      orderBy: [
        { level: 'asc' },
        { level_title: 'asc' },
        { skill: 'asc' },
        { task_id: 'asc' },
        { domain: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const levelMap = new Map<string, GroupedLessonLevel>();

    for (const lesson of lessons) {
      const levelKey = [
        lesson.level ?? '',
        lesson.level_title ?? '',
        lesson.is_pro ? '1' : '0',
      ].join('|');

      let levelGroup = levelMap.get(levelKey);
      if (!levelGroup) {
        levelGroup = {
          level_id: lesson.level,
          level_title: lesson.level_title,
          is_pro: lesson.is_pro,
          practises: [],
        };
        levelMap.set(levelKey, levelGroup);
      }

      const normalizedSkill = lesson.skill?.toLowerCase() ?? null;
      let practiceGroup = levelGroup.practises.find(
        (practice) => practice.skill === normalizedSkill,
      );
      if (!practiceGroup) {
        practiceGroup = {
          skill: normalizedSkill,
          tasks: [],
        };
        levelGroup.practises.push(practiceGroup);
      }

      let taskGroup = practiceGroup.tasks.find(
        (task) =>
          task.tasks_id === lesson.task_id &&
          task.topic === lesson.topic &&
          task.schema === lesson.schema_name,
      );

      if (!taskGroup) {
        taskGroup = {
          tasks_id: lesson.task_id,
          topic: lesson.topic,
          schema: lesson.schema_name,
          domains: [],
        };
        practiceGroup.tasks.push(taskGroup);
      }

      if (
        lesson.domain &&
        !taskGroup.domains.some(
          (domain) =>
            domain.name === lesson.domain && domain.is_pro === lesson.is_pro,
        )
      ) {
        taskGroup.domains.push({
          name: lesson.domain,
          is_pro: lesson.is_pro,
        });
      }
    }

    return Array.from(levelMap.values());
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

  async updatePublishedStatus(
    lessonId: number,
    dto: UpdateLessonStatusDto,
  ): Promise<LessonRecord> {
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { isPublished: dto.isPublished },
    });
  }

  async deleteLesson(lessonId: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.practiceSession.deleteMany({ where: { lessonId } }),
      this.prisma.questionSet.deleteMany({ where: { lessonId } }),
      this.prisma.lesson.delete({ where: { id: lessonId } }),
    ]);

    console.log(`Lesson ${lessonId} and all data deleted.`);
  }
}
