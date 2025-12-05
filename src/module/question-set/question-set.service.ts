import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { CreateQuestionSetDto } from './dto/question-set.dto';
import { LessonType, QuestionSet, SubCategoryType } from '@prisma/client';

@Injectable()
export class QuestionSetService {
    constructor(private prisma: PrismaService) {}

/**
     * Admin function to save or update a single AI-generated QuestionSet (Step 2).
     * Called by the POST /lessons/questionset endpoint.
     * It handles content saving and checks for lesson completeness to trigger publishing.
     */
 async createQuestionSet(dto: CreateQuestionSetDto) {
  const parentLesson = await this.prisma.lesson.findUnique({
    where: { id: dto.lessonId },
  });

  if (!parentLesson) {
    throw new NotFoundException(`Parent Lesson with ID ${dto.lessonId} not found.`);
  }

  // Validate that the provided subCategoryType is allowed for this lesson type.
  const allowed = this.getAllowedSubCategories(parentLesson.type);
  if (!allowed.includes(dto.subCategoryType)) {
    // If you want to be permissive, remove this check.
    throw new BadRequestException(
      `SubCategoryType ${dto.subCategoryType} is not allowed for lesson type ${parentLesson.type}.`
    );
  }

  // Upsert as before...
  const newQuestionSet = await this.prisma.questionSet.upsert({
    where: {
      lessonId_subCategoryType: {
        lessonId: dto.lessonId,
        subCategoryType: dto.subCategoryType,
      },
    },
    update: {
      prompt: dto.prompt,
      content: dto.content as any,
    },
    create: {
      lessonId: dto.lessonId,
      subCategoryType: dto.subCategoryType,
      prompt: dto.prompt,
      content: dto.content as any,
    },
  });

  // completeness check stays the same:
  const requiredCategories = this.getRequiredSubCategories(parentLesson.type);

  const existingQuestionSets = await this.prisma.questionSet.findMany({
    where: { lessonId: dto.lessonId },
    select: { subCategoryType: true },
  });

  const existingSet = new Set(existingQuestionSets.map(qs => qs.subCategoryType));

  const isComplete = requiredCategories.every(requiredCat => existingSet.has(requiredCat));

  if (isComplete && !parentLesson.isPublished) {
    await this.prisma.lesson.update({
      where: { id: dto.lessonId },
      data: { isPublished: true },
    });
  }

  return newQuestionSet;
}





     // NEW HELPER: Maps LessonType to its required SubCategoryTypes for completeness check.
     getRequiredSubCategories(type: LessonType): SubCategoryType[] {
        switch (type) {
            case LessonType.READING:
                return [SubCategoryType.MAIN_PASSAGE];
            case LessonType.LISTENING:
                return [
                    SubCategoryType.DIALOGUE_SEQUENCING,
                    SubCategoryType.DICTATION_EXERCISE,
                    SubCategoryType.AUDIO_COMPREHENSION,
                ];
            case LessonType.WRITING:
                return [
                    SubCategoryType.GRAMMAR_PRACTICE,
                    SubCategoryType.COMPLETE_THE_SENTENCES,
                    SubCategoryType.SHORT_ESSAY,
                ];
            case LessonType.SPEAKING:
                return [
                    SubCategoryType.READING_ALOUD,
                    SubCategoryType.CONVERSATION_PRACTICE,
                    SubCategoryType.PRONUNCIATION_PRACTICE,
                ];
            default:
                return [];
        }
    }





  /**
     * Frontend function to fetch a specific QuestionSet (activity content) 
     * by its parent Lesson ID and its SubCategoryType.
     * This is the dedicated endpoint for retrieving activity content piece-by-piece.
     * * @param lessonId The ID of the parent lesson container.
     * @param subCategoryType The specific activity type (e.g., DICTATION_EXERCISE).
     * @returns The QuestionSet object containing the structured 'content'.
     */
    async getQuestionSetBySubCategory(
        lessonId: number,
        subCategoryType: SubCategoryType,
    ): Promise<QuestionSet> {
        const questionSet = await this.prisma.questionSet.findUnique({
            where: {
                // Uses the unique compound key defined in the Prisma schema
                lessonId_subCategoryType: {
                    lessonId: lessonId,
                    subCategoryType: subCategoryType,
                },
            },
        });

        if (!questionSet) {
            throw new NotFoundException(
                `QuestionSet for Lesson ID ${lessonId} and type ${subCategoryType} not found. 
                It may not have been created yet or the lesson is incomplete.`
            );
        }

        return questionSet;
    }





/**
   * Allowed subcategories mapping.
   * This controls which subCategoryType values are permitted to be saved for a lesson type.
   * Make this broader if you want cross-type subcategories to be possible.
   */
  getAllowedSubCategories(type: LessonType): SubCategoryType[] {
    switch (type) {
      case LessonType.READING:
        return [
          SubCategoryType.MAIN_PASSAGE,
          // If you want reading lesson to also accept other types, add them here
        ];
      case LessonType.LISTENING:
        return [
          SubCategoryType.DIALOGUE_SEQUENCING,
          SubCategoryType.DICTATION_EXERCISE,
          SubCategoryType.AUDIO_COMPREHENSION,
          // Example: allow MAIN_PASSAGE from READING for context passages used in listening
          SubCategoryType.MAIN_PASSAGE,
        ];
      case LessonType.WRITING:
        return [
          SubCategoryType.GRAMMAR_PRACTICE,
          SubCategoryType.COMPLETE_THE_SENTENCES,
          SubCategoryType.SHORT_ESSAY,
        ];
      case LessonType.SPEAKING:
        return [
          SubCategoryType.READING_ALOUD,
          SubCategoryType.CONVERSATION_PRACTICE,
          SubCategoryType.PRONUNCIATION_PRACTICE,
        ];
      default:
        return [];
    }
  }




}
