import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertStudyPlanDto {
  @ApiProperty({
    description: 'AI-generated study plan activities JSON',
    type: 'object',
    example: {
      monday: ['Vocabulary', 'Flashcards'],
      tuesday: ['Grammar', 'Listening'],
      weeklyGoal: 'Improve speaking confidence',
    },
    additionalProperties: true,
  })
  @IsNotEmpty()
  activities: any;
}
