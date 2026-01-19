// src/prompt/dto/prompt.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePromptDto {
  @ApiProperty({
    description: 'The master prompt text that will be used by the system. This can be a detailed instruction set for AI models to follow when generating questions or providing feedback.',
    example: 'You are an expert language instructor specializing in English as a Second Language (ESL). Your role is to create engaging, contextually relevant comprehension questions that help students improve their reading skills, vocabulary, and grammar understanding. Always provide clear, concise questions that match the student\'s proficiency level.',
    maxLength: 10000,
  })
  @IsString({ message: 'Prompt text must be a string' })
  @IsNotEmpty({ message: 'Prompt text is required and cannot be empty' })
  @MaxLength(10000, { message: 'Prompt text cannot exceed 10,000 characters' })
  promptText: string;
}