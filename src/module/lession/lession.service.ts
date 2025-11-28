import { Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty, Lesson, LessonType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';

@Injectable()
export class LessionService {
    constructor(private prisma: PrismaService) {}

/**
   * Admin function to save a new AI-generated lesson to the database.
   * This should be guarded by an Admin role check in the Controller.
   */
  async createLesson(dto: CreateLessonDto) {
    // 1. Prisma handles the mapping of the DTO directly to the Lesson model.
    // The UUID is generated automatically by Prisma.
    const newLesson = await this.prisma.lesson.create({
      data: {
        type: dto.type,
        difficulty: dto.difficulty,
        prompt: dto.prompt,
        content: dto.content as any, // Cast to 'any' for Prisma Json type compatibility
        // If the admin doesn't specify, it defaults to true (published)
        isPublished: dto.isPublished ?? true, 
      },
    });

    // 2. Return the created lesson object
    return newLesson;
  }



  /**
   * Finds the next unique, unpublished lesson for a specific user based on type and level.
   * If no unique lessons are found, it returns the user's lowest-scored completed lesson for review.
   */
  async findNextLessonForUser(
    userId: string, // Uses the UUID string from the User model
    type: LessonType,
  ): Promise<Lesson> {
    // 🎯 NEW: Fetch user's current level from the database
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { currentLevel: true },
  });

  if (!user) {
    throw new NotFoundException('User profile not found.');
  }
  
  const level: Difficulty = user.currentLevel; 

    // 1. Get IDs of lessons the user has already completed
    const completedProgress = await this.prisma.userLessonProgress.findMany({
      where: { userId: userId },
      select: { lessonId: true, score: true },
    });

    const completedIds = completedProgress.map(p => p.lessonId);
    
    // 2. Try to find a NEW, UNCOMPLETED lesson
    let nextLesson = await this.prisma.lesson.findFirst({
      where: {
        type: type,
        difficulty: level,
        isPublished: true, 
        id: {
          notIn: completedIds, 
        },
      },
      // Order randomly to prevent users from always seeing lessons in the same creation order
      // Note: Ordering randomly in Postgres often requires extensions or raw SQL for true efficiency.
      // For simplicity, we'll use a basic order here.
      orderBy: { createdAt: 'asc' }, 
    });

    // 3. Handle Lesson Exhaustion (No New Lessons Found)
    if (!nextLesson) {
      console.log(`User ${userId} has exhausted all NEW ${level} ${type} lessons. Searching for review material.`);
      
      // Find the lesson the user scored the lowest on for RE-REVIEW
      const lowestScoredLesson = await this.prisma.userLessonProgress.findFirst({
        where: { 
          userId: userId, 
          lesson: { // Filter by the lesson type/difficulty within the progress records
            type: type,
            difficulty: level,
            isPublished: true,
          }
        },
        orderBy: { 
          score: 'asc' // Sort by lowest score first
        },
        include: {
          lesson: true // Include the full lesson details
        }
      });
      
      if (lowestScoredLesson) {
        nextLesson = lowestScoredLesson.lesson;
        // In a real app, you might also update the lesson title to indicate it's a "Review"
      }
    }

    // 4. Handle Total Content Exhaustion (No New or Review Lessons)
    if (!nextLesson) {
      throw new NotFoundException(
        `You have completed all available ${level} ${type} content and are ready to move up!`,
      );
      // This is where you would prompt the user to take the Level Assessment Test
    }

    return nextLesson;
  }



/**
   * Admin function to fetch all lessons with search, filter, and pagination.
   */
  async findAllLessons(query: GetLessonsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // 1. Build the dynamic WHERE clause
    const whereClause: Prisma.LessonWhereInput = {
      // 1.1 Filtering by Type and Level
      ...(query.type && { type: query.type }),
      ...(query.level && { difficulty: query.level }),
      
      // 1.2 Search by Prompt
      ...(query.search && {
        // Use 'contains' for substring search, 'mode: insensitive' for case-insensitivity
        prompt: {
          contains: query.search,
          mode: 'insensitive',
        },
      }),
    };

    // 2. Fetch total count (for pagination metadata)
    const total = await this.prisma.lesson.count({ where: whereClause });

    // 3. Fetch paginated data
    const lessons = await this.prisma.lesson.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      // Default ordering: newest first for easy review
      orderBy: { createdAt: 'desc' }, 
      // Optional: Select fewer fields if content is very large, but let's keep it full for now
    });

    // 4. Return paginated result object
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




  /**
   * Admin function to get full details of a single lesson.
   */
  async getSingleLesson(lessonId: number): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
    }

    return lesson;
  }

  /**
   * Admin function to toggle the publication status of a lesson.
   */
  async updatePublishedStatus(
    lessonId: number,
    dto: UpdateLessonStatusDto,
  ): Promise<Lesson> {
    try {
      const updatedLesson = await this.prisma.lesson.update({
        where: { id: lessonId },
        data: {
          isPublished: dto.isPublished,
        },
      });
      return updatedLesson;
    } catch (error) {
      // Handle the case where the lessonId doesn't exist
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
      }
      throw error; // Re-throw other errors
    }
  }


/**
   * Admin function to delete a lesson and all associated progress records.
   * NOTE: This performs a two-step delete to handle foreign key constraints from UserLessonProgress.
   */
  async deleteLesson(lessonId: number): Promise<void> {
    try {
      // 1. Delete all associated UserLessonProgress records first.
      // This is necessary because the Prisma schema does not specify onDelete: Cascade for this relation.
      await this.prisma.userLessonProgress.deleteMany({
        where: { lessonId: lessonId },
      });

      // 2. Delete the Lesson itself.
      await this.prisma.lesson.delete({
        where: { id: lessonId },
      });
      
      // We don't return the deleted object, just confirm success.

    } catch (error) {
      // Handle the case where the lessonId doesn't exist (Prisma error code P2025)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // If the deleteMany or the delete failed due to record not found.
        throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
      }
      throw error; // Re-throw other errors
    }
  }


}
