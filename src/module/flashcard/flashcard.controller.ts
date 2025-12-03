import { Controller, Get, Post, Body, Req, Res, HttpStatus, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FlashcardService } from './flashcard.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GradeCardDto, PauseSessionDto, StartSessionDto } from './dto/flashcard.grading.dto';
import sendResponse from '../utils/sendResponse';
import { CreateCardDto, CreateCategoryDto } from './dto/create-flashcard.dto';



@ApiTags('Flashcards (User)')
@Controller('flashcards')
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}




  // ====================================================================
  // ------------------------- CONTENT CREATION ---------------------------
  // ====================================================================

  /**
   * Endpoint to create a new flashcard category.
   */
  @Post('category')
  @Roles(Role.SUPER_ADMIN,Role.CONTENT_MANAGER) // Assuming content creation is for Admins/Content Managers
  @ApiOperation({ summary: 'ADMIN: Create a new flashcard category.' })
  @ApiResponse({ status: 201, description: 'Category created successfully.' })
  async createCategory(
    @Res() res: Response,
    @Body() dto: CreateCategoryDto,
  ) {
    const category = await this.flashcardService.createCategory(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Flashcard category created successfully.',
      data: category,
    });
  }

  /**
   * Endpoint to create a single card.
   */
  @Post('card')
  @Roles(Role.SUPER_ADMIN,Role.CONTENT_MANAGER) // Assuming content creation is for Admins/Content Managers
  @ApiOperation({ summary: 'ADMIN: Create a single flashcard within a category.' })
  @ApiResponse({ status: 201, description: 'Card created successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async createCard(
    @Res() res: Response,
    @Body() dto: CreateCardDto,
  ) {
    const card = await this.flashcardService.createCard(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Flashcard created successfully.',
      data: card,
    });
  }
  
  // ====================================================================
  // ------------------------- STUDY FLOW ---------------------------------
  // ====================================================================







  /**
   * Endpoint to get the user's dashboard overview.
   */
  @Get('overview')
  @Roles(Role.USER) 
  @ApiOperation({ summary: 'USER: Get flashcard dashboard overview (categories, due cards, lifetime stats).' })
  @ApiResponse({ status: 200, description: 'Returns the dashboard overview data.' })
  async getOverview(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // userId is guaranteed to exist by the authentication guard
    const userId = req.user!.id; 

    const overview = await this.flashcardService.getDashboardOverview(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Flashcard overview retrieved successfully.',
      data: overview,
    });
  }

  /**
   * Endpoint to start or resume a flashcard session.
   */
  @Post('session/start')
  @Roles(Role.USER) 
  @ApiOperation({ summary: 'USER: Start a new session for a category or resume the most recent active session.' })
  @ApiResponse({ status: 201, description: 'Session started/resumed successfully, returns the first card.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async startSession(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: StartSessionDto,
  ) {
    const userId = req.user!.id; 
    
    if (!dto.categoryId) {
        throw new BadRequestException('Category ID is required to start a session.');
    }

    const sessionResponse = await this.flashcardService.startSession(userId, dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Flashcard session started/resumed successfully.',
      data: sessionResponse,
    });
  }

  /**
   * Endpoint to submit a grade for the current card in an active session.
   */
  @Post('session/grade')
  @Roles(Role.USER) 
  @ApiOperation({ summary: 'USER: Submit the grade for the current card and get the next card.' })
  @ApiResponse({ status: 200, description: 'Card graded successfully, returns the next card or completion status.' })
  @ApiResponse({ status: 404, description: 'Session not found or already finished.' })
  async gradeCard(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: GradeCardDto,
  ) {
    const userId = req.user!.id; 
    
    // Basic validation
    if (!dto.sessionId || dto.cardId === undefined || dto.grade === undefined) {
        throw new BadRequestException('Session ID, card ID, and grade are required.');
    }

    const gradeResponse = await this.flashcardService.gradeCard(userId, dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: gradeResponse.sessionFinished ? 'Session completed. Well done!' : 'Card graded. Next card retrieved.',
      data: gradeResponse,
    });
  }

  /**
   * Endpoint to manually pause an active session.
   */
  @Post('session/pause')
  @Roles(Role.USER) 
  @ApiOperation({ summary: 'USER: Manually pause the current active session.' })
  @ApiResponse({ status: 200, description: 'Session paused successfully.' })
  async pauseSession(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto:PauseSessionDto, // Expected body structure
  ) {
    const userId = req.user!.id; 
    
    if (!dto.sessionId) {
        throw new BadRequestException('Session ID is required to pause the session.');
    }

    await this.flashcardService.pauseSession(userId, dto.sessionId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Flashcard session paused successfully.',
      data:null
    });
  }
}