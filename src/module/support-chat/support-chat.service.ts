import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChatSupportTicketStatus, Role } from '@prisma/client';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SupportChatService {
  private readonly logger = new Logger(SupportChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createMessage(userId: string, message: string, httpCode: number) {
    const shouldEscalate = httpCode === 401;

    const result = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.supportChatMessage.create({
        data: {
          userId,
          message,
          httpCode,
          escalated: shouldEscalate,
        },
      });

      if (!shouldEscalate) {
        return tx.supportChatMessage.findUniqueOrThrow({
          where: { id: createdMessage.id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                name: true,
              },
            },
            ticket: {
              include: {
                replies: {
                  include: { admin: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        });
      }

      await tx.supportChatTicket.create({
        data: {
          userId,
          messageId: createdMessage.id,
          status: ChatSupportTicketStatus.OPEN,
        },
      });

      return tx.supportChatMessage.findUniqueOrThrow({
        where: { id: createdMessage.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              name: true,
            },
          },
          ticket: true,
        },
      });
    });

    if (shouldEscalate && result.ticket && result.user) {
      await this.notifyAdmins({
        ticketId: result.ticket.id,
        username: result.user.username ?? result.user.name,
        email: result.user.email,
        question: result.message,
      });
    }

    return result;
  }

  async getMessageHistory(userId: string) {
    return this.prisma.supportChatMessage.findMany({
      where: { userId },
      include: {
        ticket: {
          include: {
            replies: {
              include: {
                admin: {
                  select: { id: true, email: true, username: true, name: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEscalatedTickets() {
    return this.prisma.supportChatTicket.findMany({
      include: {
        user: {
          select: { id: true, email: true, username: true, name: true },
        },
        message: true,
        replies: {
          include: {
            admin: {
              select: { id: true, email: true, username: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async replyToTicket(ticketId: string, adminId: string, reply: string) {
    const ticket = await this.prisma.supportChatTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, email: true, username: true, name: true },
        },
        message: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support chat ticket ${ticketId} not found.`);
    }

    const replyRecord = await this.prisma.$transaction(async (tx) => {
      const createdReply = await tx.supportChatTicketReply.create({
        data: {
          ticketId,
          adminId,
          reply,
        },
        include: {
          admin: {
            select: { id: true, email: true, username: true, name: true },
          },
        },
      });

      await tx.supportChatTicket.update({
        where: { id: ticketId },
        data: { status: ChatSupportTicketStatus.REPLIED },
      });

      return createdReply;
    });

    await this.notifyUserOfReply(ticket, reply);

    return replyRecord;
  }

  private async notifyAdmins(payload: {
    ticketId: string;
    username?: string | null;
    email: string;
    question: string;
  }) {
    const supportStaff = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.SUPER_ADMIN, Role.SUPORT_MANAGER] },
      },
      select: { email: true },
    });

    const recipients = [
      ...new Set(
        [
          ...supportStaff.map((user) => user.email),
          process.env.SUPER_ADMIN_EMAIL,
          process.env.ADMIN_EMAIL,
        ].filter((value): value is string => Boolean(value)),
      ),
    ];

    if (recipients.length === 0) {
      this.logger.warn(
        `Skipped unresolved chat notification for ticket ${payload.ticketId} because no admin recipient is configured.`,
      );
      return;
    }

    try {
      await this.mailService.sendSupportChatEscalation(recipients, payload);
    } catch (error) {
      this.logger.error(
        `Failed to send unresolved chat notification for ticket ${payload.ticketId}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async notifyUserOfReply(
    ticket: {
      id: string;
      user: { email: string; username?: string | null; name?: string | null };
      message: { message: string };
    },
    reply: string,
  ) {
    try {
      await this.mailService.sendSupportChatReply(
        {
          email: ticket.user.email,
          username: ticket.user.username ?? ticket.user.name,
        },
        {
          ticketId: ticket.id,
          question: ticket.message.message,
          reply,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send support chat reply email for ticket ${ticket.id}.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
