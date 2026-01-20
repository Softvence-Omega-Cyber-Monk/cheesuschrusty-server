// src/prompt/prompt.controller.ts
import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { PromptService } from './prompt.service';
import { UpdatePromptDto } from './dto/prompt.dto';
import sendResponse from '../utils/sendResponse';
import { Public } from 'src/common/decorators/public.decorators';

@ApiTags('System Prompts')
@Controller('prompts')
export class PromptController {
  constructor(private promptService: PromptService) {}

  @Public()
  @Post('master-prompt-questions')
  @ApiOperation({ 
    summary: 'Update Master Prompt for Set Question',
    description: 'Set or update the master prompt used for generating questions. This will replace any existing prompt. Accepts full prompt text including all instructions, rules, templates, and examples. This endpoint is publicly accessible and does not require authentication.'
  })
  @ApiBody({
    type: UpdatePromptDto,
    description: 'Complete master prompt text for question generation (will replace existing prompt). Include all system instructions, rules, examples, and templates.',
    examples: {
      example1: {
        summary: 'Question Generation Prompt',
        value: {
          promptText: `# Question Generation Prompt (v1.0)

You are an expert language instructor specializing in English as a Second Language (ESL).

## TASK
Generate comprehension questions based on the given text that test vocabulary, grammar, and understanding.

## RULES
* Create 5-10 questions per text
* Include multiple choice options (A, B, C, D)
* Target B1-B2 CEFR level
* Focus on main ideas and details

## OUTPUT FORMAT
1. Question text
   A) Option 1
   B) Option 2
   C) Option 3
   D) Option 4
   Answer: {letter}

## EXAMPLE
...`
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Master prompt for questions updated successfully (previous prompt has been replaced)',
    schema: {
      example: {
        success: true,
        message: 'Master prompt for questions updated successfully',
        data: {
          key: 'PROMPT_QUESTIONS',
          content: '# Question Generation Prompt (v1.0)...',
          updatedAt: '2026-01-19T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid prompt data' })
  async updateMasterPromptQuestions(@Body() dto: UpdatePromptDto, @Res() res: Response) {
    const result = await this.promptService.updateMasterPromptQuestions(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result.prompt,
    });
  }

  @Public()
  @Post('master-prompt-feedback')
  @ApiOperation({ 
    summary: 'Update Master Prompt for Feedback',
    description: 'Set or update the master prompt used for providing feedback on student answers. This will replace any existing prompt. Accepts complete prompt text including all instructions, scoring rubrics, templates, and examples. This endpoint is publicly accessible and does not require authentication.'
  })
  @ApiBody({
    type: UpdatePromptDto,
    description: 'Complete master prompt text for feedback generation (will replace existing prompt). Include all system instructions, rubrics, scoring bands, templates, and examples.',
    examples: {
      example1: {
        summary: 'CEFR B1C Feedback Prompt',
        value: {
          promptText: `# CEFR B1C Feedback Prompt (v2.8 - Performance Snapshot)

You are an accurate, honest, motivating CEFR feedback coach and calibrated rater for Italian B1 cittadinanza (B1C). Apply official-style B1 descriptors conservatively.

**SYSTEM MODE** -> ONE-SHOT EVALUATOR
**LANGUAGE** -> Italian
**FEEDBACK LANGUAGE** -> English

## TASK REGISTRY
* **L-01:** Listening (Short Interactions). 6 dialogues. MCQ (4 options).
* **R-01:** Reading (Information Search). 4 texts. 5 statements to match.
* **W-01:** Writing (Functional). Email to authority. 80-120 words.

## SCORING RULES
### BAND MAP
* 0-29 = A1
* 30-49 = A2
* 60-74 = B1
* 75-89 = B1+
* 90-100 = B2+

## OUTPUT TEMPLATE
==================================
B1 Cittadinanza Italiana - {TASK}

✅ What you already do really well
• {Strength 1}. Evidence: "{quote}". Why it helps B1C: {reason}

🔧 Small, concrete steps to improve
• {Upgrade 1}. Evidence: "{quote}". Try it now: {micro-drill}

📊 Level demonstrated in this task
{bands}

🎯 Score for this submission
{X} / 100

💡 Your 5-minute power tip
{tip in English}
{tip in Italian}
==================================`
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Master prompt for feedback updated successfully (previous prompt has been replaced)',
    schema: {
      example: {
        success: true,
        message: 'Master prompt for feedback updated successfully',
        data: {
          key: 'PROMPT_FEEDBACK',
          content: '# CEFR B1C Feedback Prompt (v2.8)...',
          updatedAt: '2026-01-19T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid prompt data' })
  async updateMasterPromptFeedback(@Body() dto: UpdatePromptDto, @Res() res: Response) {
    const result = await this.promptService.updateMasterPromptFeedback(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result.prompt,
    });
  }

  // ===========================
  // PUBLIC ROUTES
  // ===========================

  @Public()
  @Get('master-prompt-questions')
  @ApiOperation({ 
    summary: 'Get Current Master Prompt for Set Question',
    description: 'Retrieve the complete current master prompt used for generating questions. Returns the full prompt text including all instructions, rules, templates, and examples. This endpoint is publicly accessible and does not require authentication.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Master prompt for questions retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Master prompt for questions retrieved successfully',
        data: {
          key: 'PROMPT_QUESTIONS',
          content: '# Question Generation Prompt (v1.0)\n\nYou are an expert language instructor...\n\n## RULES\n* Create 5-10 questions...',
          updatedAt: '2026-01-19T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Prompt not found - Master prompt has not been configured yet' 
  })
  async getMasterPromptQuestions(@Res() res: Response) {
    const prompt = await this.promptService.getMasterPromptQuestions();
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Master prompt for questions retrieved successfully',
      data: prompt,
    });
  }

  @Public()
  @Get('master-prompt-feedback')
  @ApiOperation({ 
    summary: 'Get Current Master Prompt for Feedback',
    description: 'Retrieve the complete current master prompt used for providing feedback on student answers. Returns the full prompt text including all instructions, scoring rubrics, templates, and examples. This endpoint is publicly accessible and does not require authentication.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Master prompt for feedback retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Master prompt for feedback retrieved successfully',
        data: {
          key: 'PROMPT_FEEDBACK',
          content: '# CEFR B1C Feedback Prompt (v2.8 - Performance Snapshot)\n\nYou are an accurate, honest, motivating CEFR feedback coach...\n\n## SCORING RULES\n...',
          updatedAt: '2026-01-19T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Prompt not found - Master prompt has not been configured yet' 
  })
  async getMasterPromptFeedback(@Res() res: Response) {
    const prompt = await this.promptService.getMasterPromptFeedback();
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Master prompt for feedback retrieved successfully',
      data: prompt,
    });
  }
}