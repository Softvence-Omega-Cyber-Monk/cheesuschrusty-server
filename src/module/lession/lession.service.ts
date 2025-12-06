import { Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty, Lesson, LessonType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';
import { UpdateLessonStatusDto } from './dto/update-lesson-status.dto';
import { CreateLessonContainerDto } from './dto/create-lesson.dto';
import { QuestionSetService } from '../question-set/question-set.service';

@Injectable()
export class LessionService {
    constructor(private prisma: PrismaService,
        private questionSet:QuestionSetService) {}
 async createLessonContainer(dto: CreateLessonContainerDto): Promise<Lesson> {
        console.log(`Attempting to create new Lesson container: ${dto.title}`);
        
        // 1. Create the Parent Lesson record
        const newLesson = await this.prisma.lesson.create({
            data: {
                title: dto.title,
                type: dto.type,
                // difficulty: dto.difficulty,
                provider: dto.provider,
                isPublished: false, 
            },
        });
        
        console.log(`Lesson container created with ID: ${newLesson.id}`);
        // 2. Return the created lesson object, including the new ID
        return newLesson;
    }


   /**
  * Finds the next unique, published lesson for a specific user based on type and level.
  * If no unique lessons are found, it returns the user's lowest-scored completed lesson for review.
  * NOTE: Assumes the User model has a 'currentLevel' field.
  */
   async findNextLessonForUser(
      userId: string, // Uses the UUID string from the User model
      type: LessonType,
   ): Promise<Lesson> {
      // 🎯 NEW: Fetch user's current level from the database
        // Assuming there is a User model definition and a currentLevel field
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
              isPublished: true, // MUST be published by admin process
              id: {
                  notIn: completedIds, 
              },
          },
          // Order by creation date (asc) for consistent content flow
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
              // You might add logic here to mark this as a review lesson for the frontend
          }
      }

      // 4. Handle Total Content Exhaustion (No New or Review Lessons)
      if (!nextLesson) {
          throw new NotFoundException(
              `You have completed all available ${level} ${type} content and are ready to move up!`,
          );
          // This is where you would prompt the user to take the Level Assessment Test
      }

      // 5. Return the identified lesson
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
            
            // 1.2 Search by Title (Note: Prompt is now in QuestionSet, so we search on Title)
            ...(query.search && {
                title: {
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
            // Include QuestionSets to show completeness/details on admin listing
            include: {
                questionSets: {
                    select: {
                        id: true,
                        subCategoryType: true
                    }
                }
            }
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

    /**
  * Admin function to get full details of a single lesson.
     * Now includes all linked QuestionSets.
  */
   async getSingleLesson(lessonId: number) {
      const lesson = await this.prisma.lesson.findUnique({
          where: { id: lessonId },
            include: {
                questionSets: true, // Include all linked content for full review
            }
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
          // Ensure we don't accidentally publish an incomplete lesson manually
          if (dto.isPublished === true) {
                const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { type: true } });
                
                if (!lesson) {
                    throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
                }
                
                const requiredCategories = this.questionSet.getRequiredSubCategories(lesson.type);
                const existingCount = await this.prisma.questionSet.count({ where: { lessonId } });

                if (existingCount !== requiredCategories.length) {
                    throw new NotFoundException(`Cannot publish Lesson ID ${lessonId}. It only has ${existingCount} out of ${requiredCategories.length} required QuestionSets.`);
                }
            }
            
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
  /**
  * Admin function to delete a lesson and all associated records (UserProgress, QuestionSets).
  */
   async deleteLesson(lessonId: number): Promise<void> {
      try {
            // Use a transaction for atomic deletion
            await this.prisma.$transaction([
                // 1. Delete all associated UserLessonProgress records
                this.prisma.userLessonProgress.deleteMany({
                    where: { lessonId: lessonId },
                }),
                
                // 2. Delete all associated QuestionSet records
                this.prisma.questionSet.deleteMany({
                    where: { lessonId: lessonId },
                }),

                // 3. Delete the Lesson itself
                this.prisma.lesson.delete({
                    where: { id: lessonId },
                }),
            ]);
            
            console.log(`Lesson ID ${lessonId} and all related data deleted.`);

      } catch (error) {
          // Handle the case where the lessonId doesn't exist (Prisma error code P2025)
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
              // If the final delete failed due to record not found.
              throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
          }
          throw error; // Re-throw other errors
      }
   }

}
