// src/prompt/prompt.controller.ts
import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PromptService } from './prompt.service';
import { UpdatePromptDto } from './dto/prompt.dto';
import sendResponse from '../utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/common/decorators/public.decorators';

@ApiTags('System Prompts')
@Controller('prompts')
export class PromptController {
  constructor(private promptService: PromptService) {}
  @Post('master-prompt-questions')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update Master Prompt for Set Question',
    description: 'Allows admins to set or update the master prompt used for generating questions. Only SUPER_ADMIN and CONTENT_MANAGER roles can access this endpoint.'
  })
  @ApiBody({
    type: UpdatePromptDto,
    description: 'Master prompt text for question generation',
    examples: {
      example1: {
        summary: 'Question Generation Prompt',
        value: {
          promptText: 'You are an expert language instructor. Generate comprehension questions based on the given text that test vocabulary, grammar, and understanding...'
        }
      }
    }
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
          content: 'You are an expert language instructor...',
          updatedAt: '2026-01-19T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid prompt data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async updateMasterPromptQuestions(@Body() dto: UpdatePromptDto, @Res() res: Response) {
    const result = await this.promptService.updateMasterPromptQuestions(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result.prompt,
    });
  }

  @Post('master-prompt-feedback')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update Master Prompt for Feedback',
    description: 'Allows admins to set or update the master prompt used for providing feedback on student answers. Only SUPER_ADMIN and CONTENT_MANAGER roles can access this endpoint.'
  })
  @ApiBody({
    type: UpdatePromptDto,
    description: 'Master prompt text for feedback generation',
    examples: {
      example1: {
        summary: 'Feedback Generation Prompt',
        value: {
          promptText: 'You are a supportive language tutor. Provide constructive feedback on student responses, highlighting strengths and areas for improvement...'
        }
      }
    }
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
          content: 'You are a supportive language tutor...',
          updatedAt: '2026-01-19T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid prompt data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
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
    summary: 'Get Master Prompt for Set Question',
    description: 'Retrieve the current master prompt used for generating questions. This endpoint is publicly accessible and does not require authentication.'
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
          content: 'You are an expert language instructor. Generate comprehension questions...',
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
    summary: 'Get Master Prompt for Feedback',
    description: 'Retrieve the current master prompt used for providing feedback on student answers. This endpoint is publicly accessible and does not require authentication.'
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
          content: 'You are a supportive language tutor. Provide constructive feedback...',
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