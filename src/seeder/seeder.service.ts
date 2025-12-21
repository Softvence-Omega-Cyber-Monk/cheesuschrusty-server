import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { BadgeType, Role, SkillArea } from '@prisma/client';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(SeederService.name);

  async onApplicationBootstrap() {
    await this.seedAdmin();
    await this.seedPlans();
    await this.seedBadges();
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
    this.logger.log('Starting plan seeding via Lemon Squeezy...');
    const monthlyVariantId = process.env.LEMON_VARIANT_ID_MONTHLY as string;
    const yearlyVariantId = process.env.LEMON_VARIANT_ID_YEARLY as string;

    // --- PRO MONTHLY PLAN ---
    const monthlyPlan = await this.prisma.plan.upsert({
      where: { alias: 'PRO_MONTHLY' },
      update: {
        lemonVariantId: monthlyVariantId,
        price: 9.99,
        description: ['Unlimited access billed monthly.'],
      },
      create: {
        alias: 'PRO_MONTHLY',
        name: 'Pro Monthly',
        description: [
          'Unlimited flashcards',
          'All lessons',
          'Offline access',
          'Progress tracking',
          'Priority support',
        ],
        lemonVariantId: monthlyVariantId,
        price: 9.99,
        interval: 'month',
        isActive: true,
      },
    });

    // --- PRO YEARLY PLAN ---
    const yearlyPlan = await this.prisma.plan.upsert({
      where: { alias: 'PRO_YEARLY' },
      update: {
        lemonVariantId: yearlyVariantId,
        price: 99.99,
        description: ['Unlimited access billed annually.'],
      },
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
        lemonVariantId: yearlyVariantId,
        price: 99.99,
        interval: 'year',
        isActive: true,
      },
    });

    this.logger.log('Plan seeding finished successfully.');
    return [monthlyPlan, yearlyPlan];
  }







// ========================
  // 3. Seed Badges
  // ========================
  async seedBadges() {
    this.logger.log('Starting badge seeding...');

    const badges = [
      {
        title: 'First Steps',
        description: 'Complete your first lesson',
        icon: '👣',
        type: BadgeType.LESSONS,
        threshold: 1,
      },
      {
        title: '7 Day Streak',
        description: 'Practice 7 days in a row',
        icon: '🔥',
        type: BadgeType.STREAK,
        threshold: 7,
      },
      {
        title: '21 Day Master',
        description: 'Practice 21 days straight',
        icon: '🏆',
        type: BadgeType.STREAK,
        threshold: 21,
      },
      {
        title: 'Fast Learner',
        description: 'Complete 10 lessons in one week',
        icon: '⚡',
        type: BadgeType.LESSONS,
        threshold: 10,
      },
      {
        title: 'Accuracy Pro',
        description: 'Average 90%+ accuracy in a week',
        icon: '🎯',
        type: BadgeType.ACCURACY,
        threshold: 90,
      },
      {
        title: 'Grammar Master',
        description: 'Master Writing skill at B1+',
        icon: '📚',
        type: BadgeType.SKILL_MASTERY,
        skillArea: SkillArea.writing,
      },
      {
        title: 'Pronunciation Pro',
        description: 'Master Speaking skill at B1+',
        icon: '🎤',
        type: BadgeType.SKILL_MASTERY,
        skillArea: SkillArea.speaking,
      },
      {
        title: 'Listening Expert',
        description: 'Master Listening skill at B1+',
        icon: '👂',
        type: BadgeType.SKILL_MASTERY,
        skillArea: SkillArea.listening,
      },
      {
        title: 'Reading Champion',
        description: 'Master Reading skill at B1+',
        icon: '📖',
        type: BadgeType.SKILL_MASTERY,
        skillArea: SkillArea.reading,
      },
      {
        title: 'Citizenship Ready',
        description: 'All 4 skills at B1 with HIGH confidence — Ready for the exam!',
        icon: '🇮🇹',
        type: BadgeType.CITIZENSHIP_READY,
      },
    ];

    await this.prisma.badge.createMany({
      data: badges,
      skipDuplicates: true,
    });

    this.logger.log(`Seeded ${badges.length} badges successfully`);
  }





}
