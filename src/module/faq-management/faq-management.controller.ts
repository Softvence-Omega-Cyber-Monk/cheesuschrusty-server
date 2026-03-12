import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import sendResponse from '../utils/sendResponse';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqManagementService } from './faq-management.service';

@ApiTags('FAQ Management (Admin)')
@Controller('admin/faqs')
@Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
export class FaqManagementController {
  constructor(private readonly faqManagementService: FaqManagementService) {}

  private parseFaqId(faqId: string): number {
    const id = parseInt(faqId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('FAQ ID must be a valid number.');
    }
    return id;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new FAQ entry.' })
  @ApiBody({ type: CreateFaqDto })
  @ApiResponse({ status: 201, description: 'FAQ created successfully.' })
  async createFaq(@Body() dto: CreateFaqDto, @Res() res: Response) {
    const faq = await this.faqManagementService.createFaq(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'FAQ created successfully.',
      data: faq,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all FAQ entries.' })
  @ApiResponse({ status: 200, description: 'FAQ list retrieved successfully.' })
  async getAllFaqs(@Res() res: Response) {
    const faqs = await this.faqManagementService.getAllFaqs();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'FAQs retrieved successfully.',
      data: faqs,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single FAQ entry by ID.' })
  @ApiParam({ name: 'id', description: 'FAQ ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'FAQ retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'FAQ not found.' })
  async getFaqById(@Param('id') faqId: string, @Res() res: Response) {
    const faq = await this.faqManagementService.getFaqById(
      this.parseFaqId(faqId),
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'FAQ retrieved successfully.',
      data: faq,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an FAQ entry.' })
  @ApiParam({ name: 'id', description: 'FAQ ID', type: 'number' })
  @ApiBody({ type: UpdateFaqDto })
  @ApiResponse({ status: 200, description: 'FAQ updated successfully.' })
  @ApiResponse({ status: 404, description: 'FAQ not found.' })
  async updateFaq(
    @Param('id') faqId: string,
    @Body() dto: UpdateFaqDto,
    @Res() res: Response,
  ) {
    const faq = await this.faqManagementService.updateFaq(
      this.parseFaqId(faqId),
      dto,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'FAQ updated successfully.',
      data: faq,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an FAQ entry.' })
  @ApiParam({ name: 'id', description: 'FAQ ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'FAQ deleted successfully.' })
  @ApiResponse({ status: 404, description: 'FAQ not found.' })
  async deleteFaq(@Param('id') faqId: string, @Res() res: Response) {
    await this.faqManagementService.deleteFaq(this.parseFaqId(faqId));

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'FAQ deleted successfully.',
      data: null,
    });
  }
}
