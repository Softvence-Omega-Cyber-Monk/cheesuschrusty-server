import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
  Patch,
  Delete,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FlashcardService } from './flashcard.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  GradeCardDto,
  PauseSessionDto,
  StartSessionDto,
} from './dto/flashcard.grading.dto';
import sendResponse from '../utils/sendResponse';
import {
  CreateCardDto,
  CreateCategoryDto,
  UpdateCardDto,
} from './dto/create-flashcard.dto';
import { GetCategoryQueryDto } from './dto/flashcard.response.dto';
import * as csv from 'csv-parser';
import { FileInterceptor } from '@nestjs/platform-express';
import { Readable } from 'stream';

@ApiTags('Flashcards (User)')
@Controller('flashcards')
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  // ====================================================================
  // ------------------------- CATEGORY QUERIES ---------------------------
  // ====================================================================
  @Get('category/get')
  @Roles(Role.USER, Role.CONTENT_MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Get a category with its cards.',
    description: `Fetch specific category details and its associated flashcards.
    **Curl Example:**
    \`\`\`bash
    curl -X GET "http://localhost:5001/api/v1/flashcards/category/get?categoryId=1" \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``
  })
  @ApiResponse({
    status: 200,
    description: 'Category loaded.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: { id: 1, name: 'Travel', cards: [{ id: 12, frontText: 'Hello', backText: 'Ciao' }] }
      }
    }
  })
  async getCategoryWithCards(
    @Res() res: Response,
    @Query() query: GetCategoryQueryDto,
  ) {
    const data = await this.flashcardService.getCategoryWithCards(
      query.categoryId,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Category loaded successfully.',
      data,
    });
  }

  // ===========================
  // ----- GET ALL CATEGORIES -----
  // ===========================

  @Get('category/all')
  @Roles(Role.USER, Role.CONTENT_MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all flashcard categories.' })
  async getAllCategories(@Res() res: Response) {
    const categories = await this.flashcardService.getAllCategories();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Categories loaded successfully.',
      data: categories,
    });
  }

  // ====================================================================
  // ------------------------- CARD EDITING -------------------------------
  // ====================================================================

  @Patch('card/update/:id')
  @Roles(Role.CONTENT_MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'ADMIN: Update a flashcard.' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The ID of the card to update.',
    example: 12,
  })
  @ApiBody({
    type: UpdateCardDto,
    description: 'Fields to update in the flashcard.',
  })
  async updateCard(
    @Res() res: Response,
    @Param('id') id: number,
    @Body() dto: UpdateCardDto,
  ) {
    const cardId = Number(id);

    const data = await this.flashcardService.updateCard(cardId, dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Flashcard updated successfully.',
      data,
    });
  }
  // ====================================================================
  // ------------------------- CARD DELETION ----------------------------
  // ====================================================================

  @Delete('card/delete/:id')
  @Roles(Role.CONTENT_MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'ADMIN: Delete a flashcard.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the flashcard to delete',
    type: Number,
    example: 1,
  })
  async deleteCard(@Res() res: Response, @Req() { params }) {
    const cardId = Number(params.id);

    const result = await this.flashcardService.deleteCard(cardId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: null,
    });
  }

  // ====================================================================
  // ------------------------- CATEGORY DELETION ------------------------
  // ====================================================================

  @Delete('category/delete/:id')
  @Roles(Role.CONTENT_MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'ADMIN: Delete a flashcard category and all its cards.',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the category to delete',
    type: Number,
    example: 1,
  })
  async deleteCategory(@Res() res: Response, @Req() { params }) {
    const categoryId = Number(params.id);

    const result = await this.flashcardService.deleteCategory(categoryId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: null,
    });
  }

  async parseCsv(file: Express.Multer.File): Promise<CreateCardDto[]> {
    return new Promise((resolve, reject) => {
      const results: CreateCardDto[] = [];
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);

      readable
        .pipe(csv())
        .on('data', (row) => {
          // Handle possible BOM in CSV headers
          const frontText = (row.frontText || row['ï»¿frontText'])?.trim();
          const backText = row.backText?.trim();

          if (frontText && backText) {
            results.push({ frontText, backText } as CreateCardDto);
          }
        })
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }

  @Post('card/bulk-upload-csv')
  @Roles(Role.CONTENT_MANAGER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'ADMIN: Bulk upload flashcards using a CSV file.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file with flashcards and the categoryId.',
    schema: {
      type: 'object',
      properties: {
        categoryId: { type: 'number', example: 1 },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('categoryId') categoryId: number,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'CSV file is required.',
      });
    }

    const cards = await this.parseCsv(file);

    if (!cards.length) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'CSV file contains no valid cards.',
      });
    }

    // Map categoryId to each card to satisfy CreateCardDto
    const cardsWithCategory = cards.map((card) => ({
      ...card,
      categoryId,
    }));

    const result = await this.flashcardService.bulkUploadCards(
      Number(categoryId),
      cardsWithCategory,
    );

    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: result.message,
      data: result,
    });
  }

  // ====================================================================
  // ------------------------- CONTENT CREATION ---------------------------
  // ====================================================================

  /**
   * Endpoint to create a new flashcard category.
   */
  @Post('category')
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @ApiOperation({ 
    summary: 'ADMIN: Create a new flashcard category.',
    description: `Defines a new group for flashcards (e.g. "Travel", "Grammar").
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/flashcards/category \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"name": "Restaurant Phrases", "description": "Useful phrases for dining out"}'
    \`\`\``
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Category created successfully.',
    schema: {
      example: {
        statusCode: 201,
        success: true,
        data: { id: 1, name: "Restaurant Phrases", slug: "restaurant-phrases" }
      }
    }
  })
  async createCategory(@Res() res: Response, @Body() dto: CreateCategoryDto) {
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
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @ApiOperation({
    summary: 'ADMIN: Create a single flashcard.',
    description: `Add a new card to an existing category.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/flashcards/card \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"frontText": "Good morning", "backText": "Buongiorno", "categoryId": 1}'
    \`\`\``
  })
  @ApiResponse({ status: 201, description: 'Card created successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async createCard(@Res() res: Response, @Body() dto: CreateCardDto) {
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
  @ApiOperation({
    summary: 'USER: Get flashcard dashboard overview.',
    description: `Returns categories, due cards, and lifetime stats.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/flashcards/overview \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the dashboard overview data.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          total_cards: 150,
          due_today: 12,
          categories: [{ id: 1, name: 'Travel', card_count: 50 }]
        }
      }
    }
  })
  async getOverview(@Req() req: Request, @Res() res: Response) {
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
  @ApiOperation({
    summary: 'USER: Start/Resume a flashcard session.',
    description: `Begins a study session for a category.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/flashcards/session/start \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"categoryId": 1}'
    \`\`\``
  })
  @ApiResponse({
    status: 201,
    description: 'Session started/resumed.',
    schema: {
      example: {
        statusCode: 201,
        success: true,
        data: { sessionId: 50, currentCard: { id: 12, frontText: 'Hello' } }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async startSession(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: StartSessionDto,
  ) {
    const userId = req.user!.id;

    if (!dto.categoryId) {
      throw new BadRequestException(
        'Category ID is required to start a session.',
      );
    }

    const sessionResponse = await this.flashcardService.startSession(
      userId,
      dto,
    );

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
  @ApiOperation({
    summary: 'USER: Grade current card.',
    description: `Submits a grade (1-5) for Spaced Repetition (SRL).
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/flashcards/session/grade \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"sessionId": 50, "cardId": 12, "grade": 4}'
    \`\`\``
  })
  @ApiResponse({
    status: 200,
    description: 'Card graded.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: { nextCard: { id: 13, frontText: 'Welcome' }, sessionFinished: false }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  async gradeCard(
    @Req() req: Request,
    @Res() res: Response,
    @Body() dto: GradeCardDto,
  ) {
    const userId = req.user!.id;

    // Basic validation
    if (!dto.sessionId || dto.cardId === undefined || dto.grade === undefined) {
      throw new BadRequestException(
        'Session ID, card ID, and grade are required.',
      );
    }

    const gradeResponse = await this.flashcardService.gradeCard(userId, dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: gradeResponse.sessionFinished
        ? 'Session completed. Well done!'
        : 'Card graded. Next card retrieved.',
      data: gradeResponse,
    });
  }

  @Patch('session/pause')
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'USER: Pause current flashcard session and save current timer.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session paused and time saved successfully.',
  })
  async pauseSession(@Req() req: Request, @Body() dto: PauseSessionDto) {
    const userId = req.user!.id;

    await this.flashcardService.pauseSession(
      userId,
      dto.sessionId,
      dto.currentTimeSeconds,
    );

    return {
      success: true,
      message: 'Session paused successfully',
      data: {
        savedTimeSeconds: dto.currentTimeSeconds,
        formattedTime: this.formatTime(dto.currentTimeSeconds),
      },
    };
  }

  // Optional helper (you can move to service if you want)
  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
