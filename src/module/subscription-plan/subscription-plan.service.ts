import { Injectable, NotFoundException } from '@nestjs/common';
import { Plan, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class SubscriptionPlanService {
 constructor(private prisma: PrismaService) {}

 /**
   * ADMIN/PUBLIC: Fetches all plans from the database.
   * Public-facing endpoints can filter this list by isActive: true.
   */
  async getAllPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      orderBy: { price: 'asc' }, 
    });
  }

  async getPlanByAlias(alias: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({
      where: { alias },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with alias '${alias}' not found.`);
    }
    return plan;
  }

  /**
   * ADMIN: Updates the configuration of an existing plan.
   * Allows updating stripePriceId, price, isActive, and description.
   */
  async updatePlan(alias: string, dto: UpdatePlanDto): Promise<Plan> {
    try {
      return await this.prisma.plan.update({
        where: { alias: alias },
        data: {
          stripePriceId: dto.stripePriceId,
          price: dto.price,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      // Check for 'Record not found' error code from Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Plan with alias '${alias}' not found.`);
      }
      throw error;
    }
  }



  
}
