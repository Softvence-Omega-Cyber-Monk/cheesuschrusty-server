import { LessonType } from '@prisma/client';
import { LessionService } from './lession.service';
import { PrismaService } from 'src/common/service/prisma/prisma.service';

describe('LessionService', () => {
  let service: LessionService;
  let prisma: {
    practiceSession: { findMany: jest.Mock; findFirst: jest.Mock };
    lesson: { findFirst: jest.Mock; count: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      practiceSession: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      lesson: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new LessionService(prisma as unknown as PrismaService);
  });

  it('combines level, domain, and task_id filters for /lessons/filter', async () => {
    prisma.lesson.findFirst.mockResolvedValue({
      id: 1,
      skill: LessonType.READING,
      level: 'B1',
      domain: 'Business',
      task_id: 'L-01',
      isPublished: true,
    });

    await service.findNextLessonByTypeAndLevel(
      'user-1',
      LessonType.READING,
      'b1',
      'Business',
      'L-01',
    );

    expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
      where: {
        skill: LessonType.READING,
        level: { in: ['b1', 'B1'] },
        domain: { equals: 'Business', mode: 'insensitive' },
        task_id: { equals: 'L-01', mode: 'insensitive' },
        isPublished: true,
        id: { notIn: undefined },
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('applies normalized level and domain filters in admin lesson listing', async () => {
    await service.findAllLessons({
      page: 1,
      limit: 20,
      type: LessonType.LISTENING,
      level: 'a2',
      domain: 'travel',
    });

    expect(prisma.lesson.count).toHaveBeenCalledWith({
      where: {
        skill: LessonType.LISTENING,
        level: { in: ['a2', 'A2'] },
        domain: { equals: 'travel', mode: 'insensitive' },
      },
    });

    expect(prisma.lesson.findMany).toHaveBeenCalledWith({
      where: {
        skill: LessonType.LISTENING,
        level: { in: ['a2', 'A2'] },
        domain: { equals: 'travel', mode: 'insensitive' },
      },
      skip: 0,
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        questionSets: {
          select: { id: true },
        },
      },
    });
  });

  it('groups lesson rows into level, practise, task, and domain response data', async () => {
    prisma.lesson.findMany.mockResolvedValue([
      {
        id: 1,
        level: 'B1',
        level_title: 'standard',
        is_pro: false,
        skill: LessonType.LISTENING,
        task_id: 'L-01',
        topic: 'Daily Conversations',
        schema_name: 'MCQ',
        domain: 'travel',
        createdAt: new Date('2026-03-25T00:00:00.000Z'),
      },
      {
        id: 2,
        level: 'B1',
        level_title: 'standard',
        is_pro: true,
        skill: LessonType.LISTENING,
        task_id: 'L-01',
        topic: 'Daily Conversations',
        schema_name: 'MCQ',
        domain: 'health',
        createdAt: new Date('2026-03-25T00:01:00.000Z'),
      },
      {
        id: 3,
        level: 'B1',
        level_title: 'standard',
        is_pro: false,
        skill: LessonType.READING,
        task_id: 'R-01',
        topic: 'Information Search',
        schema_name: 'Matching',
        domain: 'education',
        createdAt: new Date('2026-03-25T00:02:00.000Z'),
      },
    ]);

    const result = await service.findGroupedLessons({});

    expect(prisma.lesson.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [
        { level: 'asc' },
        { level_title: 'asc' },
        { skill: 'asc' },
        { task_id: 'asc' },
        { domain: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    expect(result).toEqual([
      {
        level_id: 'B1',
        level_title: 'standard',
        is_pro: false,
        practises: [
          {
            skill: 'listening',
            tasks: [
              {
                tasks_id: 'L-01',
                topic: 'Daily Conversations',
                schema: 'MCQ',
                domains: [{ name: 'travel', is_pro: false }],
              },
            ],
          },
          {
            skill: 'reading',
            tasks: [
              {
                tasks_id: 'R-01',
                topic: 'Information Search',
                schema: 'Matching',
                domains: [{ name: 'education', is_pro: false }],
              },
            ],
          },
        ],
      },
      {
        level_id: 'B1',
        level_title: 'standard',
        is_pro: true,
        practises: [
          {
            skill: 'listening',
            tasks: [
              {
                tasks_id: 'L-01',
                topic: 'Daily Conversations',
                schema: 'MCQ',
                domains: [{ name: 'health', is_pro: true }],
              },
            ],
          },
        ],
      },
    ]);
  });
});
