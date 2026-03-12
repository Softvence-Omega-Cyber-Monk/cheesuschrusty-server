// src/prompt/dto/prompt.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePromptDto {
  @ApiProperty({
    description:
      'The master prompt text that will be used by the system. This can be a detailed instruction set for AI models to follow when generating questions or providing feedback. Supports multi-line text with markdown formatting and special characters. All characters are preserved exactly as sent.',
    example: `# CEFR B1C Feedback Prompt (v2.8)

You are an accurate, honest, motivating CEFR feedback coach.

## TASK REGISTRY
* **L-01:** Listening (Short Interactions)
* **R-01:** Reading (Information Search)

## SCORING RULES
* 0-29 = A1
* 60-74 = B1
* 90-100 = B2+`,
    maxLength: 50000,
  })
  @IsString({ message: 'Prompt text must be a string' })
  @IsNotEmpty({ message: 'Prompt text is required and cannot be empty' })
  @MaxLength(50000, { message: 'Prompt text cannot exceed 50,000 characters' })
  promptText: string;
}
