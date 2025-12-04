import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, TicketStatus, Role, TicketPriority } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TicketService {
    constructor(private prisma: PrismaService) {}

    /**
     * Utility: check if user is support staff
     */
    private isSupportStaff(role: Role): boolean {
        return role === 'SUPORT_MANAGER' || role === 'SUPER_ADMIN';
    }

    /**
     * Create a new support ticket with the first message.
     */
/**
 * Create a new support ticket with the first message.
 */
async createTicket(userId: string, subject: string, message: string) {
    console.log(`Creating new support ticket by user: ${userId}`);

    const ticket = await this.prisma.supportTicket.create({
        data: {
            userId,
            subject,
            status: TicketStatus.OPEN, 
            messages: {
                create: {
                    senderId: userId,
                    message,
                },
            },
        },
        include: {
            messages: true,
        },
    });

    console.log(`Ticket created with ID: ${ticket.id}`);
    return ticket;
}

    /**
     * Get all tickets created by a specific user.
     */
    async getUserTickets(userId: string) {
        console.log(`Fetching tickets for user ${userId}`);

        return this.prisma.supportTicket.findMany({
            where: { userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: { sender: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Admin function: get all tickets in the system.
     */
 async getAllTickets(
    role: Role,
    page = 1,
    limit = 20,
    status?: TicketStatus,
    priority?: TicketPriority,
  ) {
    if (!this.isSupportStaff(role)) {
      throw new ForbiddenException('Unauthorized access to all tickets.');
    }

    const skip = (page - 1) * limit;

    // Build dynamic filter object
    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    // Count total matching tickets
    const total = await this.prisma.supportTicket.count({ where: whereClause });

    // Fetch paginated tickets with messages and user info
    const tickets = await this.prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: true },
        },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }



    /**
   * Fetch a single ticket by ID (admin/staff dashboard view)
   */
  async getSingleTicket(ticketId: string, role: Role) {
    if (!this.isSupportStaff(role)) {
      throw new ForbiddenException('Unauthorized access to this ticket.');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: true }, // Include sender details
        },
        user: true, // Include ticket owner info
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found.`);
    }

    return ticket;
  }

    /**
     * Send a reply message to a ticket.
     */
    async addMessage(ticketId: string, senderId: string, message: string, role: Role) {
        console.log(`User ${senderId} attempting to reply to ticket ${ticketId}`);

        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: { user: true },
        });

        if (!ticket) {
            throw new NotFoundException(`Ticket with ID ${ticketId} not found.`);
        }

        // Users can only reply to their own tickets
        if (ticket.userId !== senderId && !this.isSupportStaff(role)) {
            throw new ForbiddenException('You cannot reply to this ticket.');
        }

        const newMessage = await this.prisma.supportTicketMessage.create({
            data: {
                ticketId,
                senderId,
                message,
            },
        });

        console.log(`Message added to ticket ${ticketId}`);
        return newMessage;
    }

    /**
     * Update ticket status (Support staff only)
     */
    async updateStatus(ticketId: string, newStatus: TicketStatus, role: Role) {
        if (!this.isSupportStaff(role)) {
            throw new ForbiddenException('Only support staff can update ticket status.');
        }

        console.log(`Updating status for ticket ${ticketId} → ${newStatus}`);

        try {
            const updated = await this.prisma.supportTicket.update({
                where: { id: ticketId },
                data: { status: newStatus },
            });

            return updated;

        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`Ticket with ID ${ticketId} not found.`);
            }
            throw error;
        }
    }




async getTicketMetaData() {
    const totalTickets = await this.prisma.supportTicket.count();
    const openTickets = await this.prisma.supportTicket.count({
        where: { status: 'OPEN' },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const resolvedToday = await this.prisma.supportTicket.count({
        where: {
            status: 'RESOLVED',
            updatedAt: { gte: todayStart },
        },
    });

    // Calculate average response time
const tickets = await this.prisma.supportTicket.findMany({
  include: { 
    messages: {
      include: { sender: true }, 
    },
  },
});

    const responseTimes: number[] = [];

    tickets.forEach(ticket => {
        // Get first staff reply
        const firstReply = ticket.messages
            .filter(msg => msg.sender!.role === 'SUPORT_MANAGER' || msg.sender.role === 'SUPER_ADMIN')
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

        if (firstReply) {
            const diffMs = firstReply.createdAt.getTime() - ticket.createdAt.getTime();
            responseTimes.push(diffMs);
        }
    });

    const avgResponseTimeMs = responseTimes.length
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Convert ms → human readable
    const totalSeconds = Math.round(avgResponseTimeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const avgResponseTime = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;

    return {
        totalTickets,
        openTickets,
        resolvedToday,
        avgResponseTime,
    };
}









}
