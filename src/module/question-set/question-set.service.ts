import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { CreateQuestionSetDto } from './dto/question-set.dto';
import { QuestionSet } from '@prisma/client';

@Injectable()
export class QuestionSetService {
  constructor(private prisma: PrismaService) {}

  /**
   * Admin function to save or update a QuestionSet.
   */
  async createQuestionSet(dto: CreateQuestionSetDto) {
    const parentLesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
    });

    if (!parentLesson) {
      throw new NotFoundException(
        `Parent Lesson with ID ${dto.lessonId} not found.`,
      );
    }

    // Create or update the question set - only one per lesson
    const questionSet = await this.prisma.questionSet.upsert({
      where: {
        id: dto.id || 0, // Use id if updating, 0 if creating new
      },
      update: {
        prompt: dto.prompt,
        content: dto.content as any,
      },
      create: {
        lessonId: dto.lessonId,
        prompt: dto.prompt,
        content: dto.content as any,
      },
    });

    // Auto-publish the lesson once question set is created
    if (!parentLesson.isPublished) {
      await this.prisma.lesson.update({
        where: { id: dto.lessonId },
        data: { isPublished: true },
      });
    }

    return questionSet;
  }

  /**
   * Get QuestionSet by lesson ID only
   */
  async getQuestionSetByLessonId(lessonId: number): Promise<QuestionSet> {
    const questionSet = await this.prisma.questionSet.findFirst({
      where: {
        lessonId: lessonId,
      },
    });

    if (!questionSet) {
      throw new NotFoundException(
        `QuestionSet for Lesson ID ${lessonId} not found.`,
      );
    }

    return questionSet;
  }
}
