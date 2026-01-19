// src/prompt/prompt.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { UpdatePromptDto } from './dto/prompt.dto';

@Injectable()
export class PromptService {
  constructor(private prisma: PrismaService) {}

  /**
   * Update Master Prompt for Set Question (Admin only)
   */
  async updateMasterPromptQuestions(dto: UpdatePromptDto) {
    const prompt = await this.prisma.systemPrompt.upsert({
      where: { key: 'PROMPT_QUESTIONS' },
      update: {
        content: dto.promptText,
        updatedAt: new Date(),
      },
      create: {
        key: 'PROMPT_QUESTIONS',
        content: dto.promptText,
      },
    });

    return {
      message: 'Master prompt for questions updated successfully',
      prompt: {
        key: prompt.key,
        content: prompt.content,
        updatedAt: prompt.updatedAt,
      },
    };
  }

  /**
   * Update Master Prompt for Feedback (Admin only)
   */
  async updateMasterPromptFeedback(dto: UpdatePromptDto) {
    const prompt = await this.prisma.systemPrompt.upsert({
      where: { key: 'PROMPT_FEEDBACK' },
      update: {
        content: dto.promptText,
        updatedAt: new Date(),
      },
      create: {
        key: 'PROMPT_FEEDBACK',
        content: dto.promptText,
      },
    });

    return {
      message: 'Master prompt for feedback updated successfully',
      prompt: {
        key: prompt.key,
        content: prompt.content,
        updatedAt: prompt.updatedAt,
      },
    };
  }

  /**
   * Get Master Prompt for Set Question (Public)
   */
  async getMasterPromptQuestions() {
    const prompt = await this.prisma.systemPrompt.findUnique({
      where: { key: 'PROMPT_QUESTIONS' },
      select: {
        key: true,
        content: true,
        updatedAt: true,
      },
    });

    if (!prompt) {
      throw new NotFoundException('Master prompt for questions not found');
    }

    return prompt;
  }

  /**
   * Get Master Prompt for Feedback (Public)
   */
  async getMasterPromptFeedback() {
    const prompt = await this.prisma.systemPrompt.findUnique({
      where: { key: 'PROMPT_FEEDBACK' },
      select: {
        key: true,
        content: true,
        updatedAt: true,
      },
    });

    if (!prompt) {
      throw new NotFoundException('Master prompt for feedback not found');
    }

    return prompt;
  }
}