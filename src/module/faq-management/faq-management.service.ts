import { Injectable, NotFoundException } from '@nestjs/common';
import { Faq } from '@prisma/client';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Injectable()
export class FaqManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async createFaq(dto: CreateFaqDto): Promise<Faq> {
    return this.prisma.faq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
      },
    });
  }

  async getAllFaqs(): Promise<Faq[]> {
    return this.prisma.faq.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFaqById(id: number): Promise<Faq> {
    const faq = await this.prisma.faq.findUnique({
      where: { id },
    });

    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found.`);
    }

    return faq;
  }

  async updateFaq(id: number, dto: UpdateFaqDto): Promise<Faq> {
    await this.getFaqById(id);

    return this.prisma.faq.update({
      where: { id },
      data: {
        question: dto.question,
        answer: dto.answer,
      },
    });
  }

  async deleteFaq(id: number): Promise<void> {
    await this.getFaqById(id);
    await this.prisma.faq.delete({
      where: { id },
    });
  }
}
