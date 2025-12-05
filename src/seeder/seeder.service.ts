import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(SeederService.name);

  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL as string;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD as string;

    const supperAdmin = await this.prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN},
    });

    if ( supperAdmin) {
      this.logger.log('Admin is already exists, skipping seeding.');
      return;
    }

    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    await this.prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
      },
    });

    this.logger.log(`Default super admin created: ${superAdminEmail}`);
  }

  async seedPlans() {
    this.logger.log('Starting plan seeding via API...');
    const monthlyStripeId = process.env.STRIPE_PRICE_ID_MONTHLY as string;
    const yearlyStripeId =  process.env.STRIPE_PRICE_ID_YEARLY as string;
    
    // --- PRO MONTHLY PLAN ---
    const monthlyPlan = await this.prisma.plan.upsert({
      where: { alias: 'PRO_MONTHLY' },
      update: { stripePriceId: monthlyStripeId, price: 9.99, description: ['Unlimited access billed monthly.'] },
      create: {
        alias: 'PRO_MONTHLY',
        name: 'Pro Monthly',
        // NOTE: We ensure the description matches the array type here
        description: [
          'Unlimited flashcards',
          'All lessons',
          'Offline access',
          'Progress tracking',
          'Priority support',
        ], 
        stripePriceId: monthlyStripeId,
        price: 9.99,
        interval: 'month',
        isActive: true,
      },
    });
    
    // --- PRO YEARLY PLAN ---
    const yearlyPlan = await this.prisma.plan.upsert({
      where: { alias: 'PRO_YEARLY' },
      update: { stripePriceId: yearlyStripeId, price: 99.99, description: ['Unlimited access billed annually.'] },
      create: {
        alias: 'PRO_YEARLY',
        name: 'Pro Yearly',
        description: [
          'Unlimited flashcards',
          'All lessons',
          'Offline access',
          'Progress tracking',
          'Priority support',
        ], 
        stripePriceId: yearlyStripeId,
        price: 99.99,
        interval: 'year',
        isActive: true,
      },
    });

    this.logger.log('Plan seeding finished successfully.');
    
    return [monthlyPlan, yearlyPlan];
  }
}
