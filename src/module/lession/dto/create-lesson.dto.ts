import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { LessonType, Difficulty, AIProvider } from '@prisma/client'; 
import { ApiProperty } from '@nestjs/swagger'; 

const lessonTypes = Object.values(LessonType);
// const difficultyLevels = Object.values(Difficulty);
const aiProviders = Object.values(AIProvider);

/**
 * DTO used for the first step of lesson creation: defining the parent container.
 * This sets the metadata (Title, Type, Difficulty, Provider) for the entire lesson.
 */
export class CreateLessonContainerDto {
  @ApiProperty({
    description: 'The user-facing title for the new lesson.',
    example: 'B1 Travel Planning Dialogue',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The type of lesson being created (e.g., SPEAKING, LISTENING).',
    enum: lessonTypes,
    example: LessonType.LISTENING,
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(lessonTypes)
  type: LessonType;

  // @ApiProperty({
  //   description: 'The proficiency level this lesson is targeted at.',
  //   enum: difficultyLevels,
  //   example: Difficulty.B1,
  // })
  // @IsNotEmpty()
  // @IsString()
  // @IsIn(difficultyLevels)
  // difficulty: Difficulty;
  
  @ApiProperty({
    description: 'The AI provider chosen by the admin for generating this content.',
    enum: aiProviders,
    example: AIProvider.OPENAI,
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(aiProviders)
  provider: AIProvider;
}