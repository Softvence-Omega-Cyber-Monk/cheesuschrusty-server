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
});
