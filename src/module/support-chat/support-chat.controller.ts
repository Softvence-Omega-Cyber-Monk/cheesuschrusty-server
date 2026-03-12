import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import sendResponse from '../utils/sendResponse';
import { CreateSupportChatMessageDto } from './dto/create-support-chat-message.dto';
import { ReplySupportChatTicketDto } from './dto/reply-support-chat-ticket.dto';
import { SupportChatService } from './support-chat.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@ApiTags('Support Chat')
@Controller('support-chat')
export class SupportChatController {
  constructor(private readonly supportChatService: SupportChatService) {}

  @Post('message')
  @Roles(Role.USER)
  @ApiOperation({
    summary:
      'Store a user message. If httpCode is 401, escalate it to admins by email and create a ticket.',
  })
  @ApiBody({ type: CreateSupportChatMessageDto })
  async createMessage(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSupportChatMessageDto,
    @Res() res: Response,
  ) {
    const data = await this.supportChatService.createMessage(
      req.user.id,
      dto.message,
      dto.httpCode,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message:
        dto.httpCode === 401
          ? 'Message stored and escalated to support.'
          : 'Message stored successfully.',
      data,
    });
  }

  @Get('message')
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Get all support chat messages for the logged in user.',
  })
  async getMessages(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const data = await this.supportChatService.getMessageHistory(req.user.id);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Message history retrieved successfully.',
      data,
    });
  }

  @Get('tickets')
  @Roles(Role.SUPER_ADMIN, Role.SUPORT_MANAGER)
  @ApiOperation({
    summary:
      'Get all escalated support chat tickets that were emailed to admins.',
  })
  async getTickets(@Res() res: Response) {
    const data = await this.supportChatService.getEscalatedTickets();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Escalated tickets retrieved successfully.',
      data,
    });
  }

  @Post('tickets/:id/reply')
  @Roles(Role.SUPER_ADMIN, Role.SUPORT_MANAGER)
  @ApiOperation({
    summary:
      'Reply to an escalated support chat ticket and email the reply to the user.',
  })
  @ApiBody({ type: ReplySupportChatTicketDto })
  async createTicketReply(
    @Req() req: AuthenticatedRequest,
    @Param('id') ticketId: string,
    @Body() dto: ReplySupportChatTicketDto,
    @Res() res: Response,
  ) {
    const data = await this.supportChatService.replyToTicket(
      ticketId,
      req.user.id,
      dto.reply,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Reply stored and emailed to the user.',
      data,
    });
  }

  @Patch('tickets/:id/reply')
  @Roles(Role.SUPER_ADMIN, Role.SUPORT_MANAGER)
  @ApiOperation({
    summary:
      'Reply to an escalated support chat ticket and email the reply to the user.',
  })
  @ApiBody({ type: ReplySupportChatTicketDto })
  async updateTicketReply(
    @Req() req: AuthenticatedRequest,
    @Param('id') ticketId: string,
    @Body() dto: ReplySupportChatTicketDto,
    @Res() res: Response,
  ) {
    const data = await this.supportChatService.replyToTicket(
      ticketId,
      req.user.id,
      dto.reply,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Reply stored and emailed to the user.',
      data,
    });
  }
}
