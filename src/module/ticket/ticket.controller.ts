// src/module/ticket/ticket.controller.ts

import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Query, 
  Body, 
  Param, 
  Req, 
  Res, 
  HttpStatus, 
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { Role, TicketStatus, TicketPriority } from '@prisma/client';
import { TicketService } from './ticket.service';
import sendResponse from '../utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AddTicketMessageDto, CreateTicketDto, UpdateTicketStatusDto } from './dto/support-ticket.dto';


@ApiTags('Support Tickets')
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // ---------------------------------------------------
  // USER: Create a new support ticket
  // ---------------------------------------------------
  @Post()
  @Roles(Role.USER)
  @ApiOperation({ summary: 'USER: Create a new support ticket with initial message.' })
  @ApiBody({ type: CreateTicketDto })
  @ApiResponse({ status: 201, description: 'Ticket created successfully.' })
  async createTicket(@Req() req: Request, @Res() res: Response, @Body() dto: CreateTicketDto) {
    const userId = req.user!.id;
    const ticket = await this.ticketService.createTicket(userId, dto.subject, dto.message);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Ticket created successfully.',
      data: ticket,
    });
  }

  // ---------------------------------------------------
  // USER: Get all tickets created by current user
  // ---------------------------------------------------
  @Get('my-tickets')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'USER: Get all your own support tickets.' })
  @ApiResponse({ status: 200, description: 'Returns list of user tickets.' })
  async getUserTickets(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.id;
    const tickets = await this.ticketService.getUserTickets(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User tickets retrieved successfully.',
      data: tickets,
    });
  }

  // ---------------------------------------------------
  // ADMIN/STAFF: Get all tickets with optional filters & pagination
  // ---------------------------------------------------
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SUPORT_MANAGER)
  @ApiOperation({ summary: 'ADMIN: Get all tickets with optional status/priority filters and pagination.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TicketPriority })
  @ApiResponse({ status: 200, description: 'Paginated list of tickets.' })
  async getAllTickets(
    @Req() req: Request,
    @Res() res: Response,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority
  ) {
    const role = req.user!.role as Role;
    const tickets = await this.ticketService.getAllTickets(role, page, limit, status, priority);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Tickets retrieved successfully.',
      data: tickets,
    });
  }

  // ---------------------------------------------------
  // ADMIN/STAFF: Get single ticket by ID
  // ---------------------------------------------------
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.SUPORT_MANAGER)
  @ApiOperation({ summary: 'ADMIN: Get a single ticket by ID.' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket details with messages.' })
  async getSingleTicket(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const role = req.user!.role as Role;
    const ticket = await this.ticketService.getSingleTicket(id, role);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Ticket retrieved successfully.',
      data: ticket,
    });
  }

  // ---------------------------------------------------
  // USER & STAFF: Add message to a ticket
  // ---------------------------------------------------
  @Post(':id/message')
  @Roles(Role.USER, Role.SUPER_ADMIN, Role.SUPORT_MANAGER)
  @ApiOperation({ summary: 'Add a message to an existing ticket (user can only reply to own tickets).' })
  @ApiBody({ type: AddTicketMessageDto })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async addMessage(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') ticketId: string,
    @Body() dto: AddTicketMessageDto
  ) {
    const senderId = req.user!.id;
    const role = req.user!.role as Role;

    const message = await this.ticketService.addMessage(ticketId, senderId, dto.message, role);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Message added successfully.',
      data: message,
    });
  }

  // ---------------------------------------------------
  // STAFF: Update ticket status
  // ---------------------------------------------------
  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.SUPORT_MANAGER)
  @ApiOperation({ summary: 'Update the status of a ticket (support staff only).' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiBody({ type: UpdateTicketStatusDto })
  async updateStatus(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto
  ) {
    const role = req.user!.role as Role;
    const updatedTicket = await this.ticketService.updateStatus(ticketId, dto.status, role);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Ticket status updated successfully.',
      data: updatedTicket,
    });
  }
}
