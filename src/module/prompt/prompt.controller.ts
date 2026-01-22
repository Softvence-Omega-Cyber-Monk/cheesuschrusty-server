// src/prompt/prompt.controller.ts
import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PromptService } from './prompt.service';
import sendResponse from '../utils/sendResponse';
import { Public } from 'src/common/decorators/public.decorators';

@ApiTags('System Prompts')
@Controller('prompts')
export class PromptController {
  constructor(private promptService: PromptService) {}

  @Public()
  @Post('master-prompt-questions/raw')
  @ApiOperation({ 
    summary: 'Update Master Prompt for Questions (Raw Text)',
    description: 'Set or update the master prompt used for generating questions. Send the complete prompt as plain text in the request body. All characters (quotes, brackets, newlines, symbols) are preserved exactly as sent. Content-Type must be text/plain.'
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
          content: '# Question Generation Prompt...',
          updatedAt: '2026-01-19T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Empty or invalid prompt text' })
  async updateMasterPromptQuestions(@Body() rawText: string, @Res() res: Response) {
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
    description: 'Set or update the master prompt used for providing feedback. Send the complete prompt as plain text in the request body. All characters (quotes, brackets, newlines, symbols) are preserved exactly as sent. Content-Type must be text/plain.'
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
          content: '# CEFR B1C Feedback Prompt...',
          updatedAt: '2026-01-19T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Empty or invalid prompt text' })
  async updateMasterPromptFeedback(@Body() rawText: string, @Res() res: Response) {
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

  // ===========================
  // GET ROUTES
  // ===========================

  @Public()
  @Get('master-prompt-questions')
  @ApiOperation({ 
    summary: 'Get Current Master Prompt for Questions',
    description: 'Retrieve the complete current master prompt used for generating questions. Returns the full prompt text exactly as it was stored, with all formatting and special characters preserved.'
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
          content: '# Question Generation Prompt...',
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
    description: 'Retrieve the complete current master prompt used for providing feedback. Returns the full prompt text exactly as it was stored, with all formatting and special characters preserved.'
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
          content: '# CEFR B1C Feedback Prompt...',
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