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

  // ===========================
  // RAW TEXT ENDPOINTS (Recommended for large prompts with special characters)
  // ===========================

  @Public()
  @Post('master-prompt-questions/raw')
  @ApiOperation({ 
    summary: 'Update Master Prompt for Questions (Raw Text)',
    description: 'Set or update the master prompt using raw text format. This endpoint accepts plain text directly in the request body without JSON encoding, preserving ALL characters including newlines, quotes, brackets, and special symbols exactly as sent. Content-Type must be text/plain. This is the RECOMMENDED method for uploading complex prompts.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Master prompt for questions updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Master prompt for questions updated successfully',
        data: {
          key: 'PROMPT_QUESTIONS',
          content: '# Question Generation Prompt (v1.0)\n\nYou are an expert...',
          updatedAt: '2026-01-19T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Empty or invalid prompt text' })
  async updateMasterPromptQuestionsRaw(@Body() rawText: string, @Res() res: Response) {
    // Validate that text is not empty
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return sendResponse(res, {
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Prompt text is required and cannot be empty',
        data: null,
      });
    }

    // Validate max length (50,000 characters)
    if (rawText.length > 50000) {
      return sendResponse(res, {
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Prompt text cannot exceed 50,000 characters',
        data: null,
      });
    }

    const result = await this.promptService.updateMasterPromptQuestions({ promptText: rawText });
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result.prompt,
    });
  }

  @Public()
  @Post('master-prompt-feedback/raw')
  @ApiOperation({ 
    summary: 'Update Master Prompt for Feedback (Raw Text)',
    description: 'Set or update the master prompt using raw text format. This endpoint accepts plain text directly in the request body without JSON encoding, preserving ALL characters including newlines, quotes, brackets, and special symbols exactly as sent. Content-Type must be text/plain. This is the RECOMMENDED method for uploading complex prompts.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Master prompt for feedback updated successfully',
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
  @ApiResponse({ status: 400, description: 'Bad request - Empty or invalid prompt text' })
  async updateMasterPromptFeedbackRaw(@Body() rawText: string, @Res() res: Response) {
    // Validate that text is not empty
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return sendResponse(res, {
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Prompt text is required and cannot be empty',
        data: null,
      });
    }

    // Validate max length (50,000 characters)
    if (rawText.length > 50000) {
      return sendResponse(res, {
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Prompt text cannot exceed 50,000 characters',
        data: null,
      });
    }

    const result = await this.promptService.updateMasterPromptFeedback({ promptText: rawText });
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result.prompt,
    });
  }

  @Public()
  @Post('master-prompt-questions')
  @ApiOperation({ 
    summary: 'Update Master Prompt for Set Question',
    description: 'Set or update the master prompt used for generating questions. This will replace any existing prompt. Accepts full prompt text including all instructions, rules, templates, and examples. Send as JSON with properly escaped newlines (\\n) or use text/plain content-type. This endpoint is publicly accessible and does not require authentication.'
  })
  @ApiBody({
    type: UpdatePromptDto,
    description: 'Complete master prompt text for question generation (will replace existing prompt). Include all system instructions, rules, examples, and templates. IMPORTANT: When sending via JSON, escape newlines as \\n or send the content-type as text/plain.',
    examples: {
      example1: {
        summary: 'Question Generation Prompt (JSON format)',
        value: {
          promptText: "# Question Generation Prompt (v1.0)\n\nYou are an expert language instructor.\n\n## RULES\n* Create 5-10 questions per text\n* Include multiple choice options"
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
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid prompt data. Make sure newlines are escaped as \\n in JSON, or the prompt text is properly formatted.' 
  })
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
    description: 'Set or update the master prompt used for providing feedback on student answers. This will replace any existing prompt. Accepts complete prompt text including all instructions, scoring rubrics, templates, and examples. Send as JSON with properly escaped newlines (\\n) or use text/plain content-type. This endpoint is publicly accessible and does not require authentication.'
  })
  @ApiBody({
    type: UpdatePromptDto,
    description: 'Complete master prompt text for feedback generation (will replace existing prompt). Include all system instructions, rubrics, scoring bands, templates, and examples. IMPORTANT: When sending via JSON, escape newlines as \\n or send the content-type as text/plain.',
    examples: {
      example1: {
        summary: 'CEFR B1C Feedback Prompt (JSON format)',
        value: {
          promptText: "# CEFR B1C Feedback Prompt (v2.8)\n\nYou are an accurate, honest, motivating CEFR feedback coach.\n\n## TASK REGISTRY\n* **L-01:** Listening (Short Interactions)\n\n## SCORING RULES\n* 0-29 = A1\n* 60-74 = B1"
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
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid prompt data. Make sure newlines are escaped as \\n in JSON, or the prompt text is properly formatted.' 
  })
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