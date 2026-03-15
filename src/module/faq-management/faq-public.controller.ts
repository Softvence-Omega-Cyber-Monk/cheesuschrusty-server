import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'src/common/decorators/public.decorators';
import sendResponse from '../utils/sendResponse';
import { FaqManagementService } from './faq-management.service';

@ApiTags('FAQs (Public)')
@Controller('faqs')
export class FaqPublicController {
  constructor(private readonly faqManagementService: FaqManagementService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'PUBLIC: Get all FAQ entries.' })
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
}
