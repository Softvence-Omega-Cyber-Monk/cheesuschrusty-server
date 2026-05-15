import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  BadgeType,
  Role,
  SkillArea,
  LessonType,
  Difficulty,
  CredentialProvider,
} from '@prisma/client';
import { createHash } from 'crypto';
import { EncryptionService } from 'src/common/service/encryption/encryption.service';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  private readonly logger = new Logger(SeederService.name);

  async onApplicationBootstrap() {
    await this.seedAdmin();
    await this.seedPlans();
    await this.seedBadges();
    await this.seedFaqs();
    await this.seedFlashcards();
    await this.seedLessons();
    await this.seedIntegrationCredentials();
  }

  private async seedAdmin() {
    const superAdminEmail =
      process.env.SUPER_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL;
    const superAdminPassword =
      process.env.SUPER_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;

    if (!superAdminEmail || !superAdminPassword) {
      throw new Error(
        'Missing admin seed credentials. Set SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD.',
      );
    }

    const superAdmin = await this.prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });

    if (superAdmin) {
      this.logger.log('Admin already exists, skipping seeding.');
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
    const monthlyVariantId =
      process.env.LEMON_VARIANT_ID_MONTHLY ?? process.env.LEMON_VARIANT_ID;
    const lifetimeVariantId =
      process.env.LEMON_VARIANT_ID_LIFE_TIME ??
      process.env.LEMON_VARIANT_ID_LIFETIME ??
      process.env.LEMON_VARIANT_ID;

    if (!monthlyVariantId || !lifetimeVariantId) {
      this.logger.warn(
        'Skipping plan seeding. Set LEMON_VARIANT_ID_MONTHLY and LEMON_VARIANT_ID_LIFE_TIME (or LEMON_VARIANT_ID_LIFETIME).',
      );
      return [];
    }

    const monthlyDescription = [
      'Unlimited Exam Logic Modules',
      'Full Adaptive Memory Flashcards',
      'Instant AI Tactical Feedback',
      'Real-Time Mock Assessments',
    ];

    const lifetimeDescription = [
      'Unlimited Exam Logic Modules',
      'Full Adaptive Memory Flashcards',
      'Instant AI Tactical Feedback',
      'Real-Time Mock Assessments',
    ];

    // --- PRO MONTHLY PLAN ---
    const monthlyPlan = await this.prisma.plan.upsert({
      where: { alias: 'PRO_MONTHLY' },
      update: {
        lemonVariantId: monthlyVariantId,
        price: 29.99,
        description: monthlyDescription,
      },
      create: {
        alias: 'PRO_MONTHLY',
        name: 'Pro Monthly',
        description: monthlyDescription,
        lemonVariantId: monthlyVariantId,
        price: 29.99,
        interval: 'month',
        isActive: true,
      },
    });

    // --- PRO LIFETIME PLAN ---
    const lifetimePlan = await this.prisma.plan.upsert({
      where: { alias: 'PRO_LIFETIME' },
      update: {
        lemonVariantId: lifetimeVariantId,
        price: 199.99,
        description: lifetimeDescription,
      },
      create: {
        alias: 'PRO_LIFETIME',
        name: 'Lifetime Access',
        description: lifetimeDescription,
        lemonVariantId: lifetimeVariantId,
        price: 199.99,
        interval: 'one_time',
        isActive: true,
      },
    });

    this.logger.log('Plan seeding finished successfully.');
    return [monthlyPlan, lifetimePlan];
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
        description:
          'All 4 skills at B1 with HIGH confidence — Ready for the exam!',
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

  // ========================
  // 4. Seed FAQs
  // ========================
  async seedFaqs() {
    this.logger.log('Starting FAQ seeding...');
    const faqs = [
      {
        question: 'How does the adaptive learning work?',
        answer:
          'Our AI analyzes your performance in real-time and adjusts the difficulty of flashcards and lessons to match your current skill level, focusing on areas where you need the most improvement.',
      },
      {
        question: 'Can I study offline?',
        answer:
          'Currently, the platform requires an internet connection to sync your progress with the AI engine, but we are working on an offline mode for flashcards.',
      },
      {
        question: 'What is the "Citizenship Ready" badge?',
        answer:
          'This is our highest achievement, awarded when you reach B1 level proficiency across all four skills (Reading, Writing, Listening, Speaking) with high confidence.',
      },
    ];

    for (const faq of faqs) {
      await this.prisma.faq.upsert({
        where: { id: faqs.indexOf(faq) + 1 }, // Simple ID mapping for seeding
        update: faq,
        create: faq,
      });
    }
    this.logger.log(`Seeded ${faqs.length} FAQs successfully`);
  }

  // ========================
  // 5. Seed Flashcards
  // ========================
  async seedFlashcards() {
    this.logger.log('Starting flashcard seeding...');

    const categories = [
      { title: 'Common Italian Verbs', difficulty: Difficulty.A1 },
      { title: 'Food & Dining', difficulty: Difficulty.A2 },
      { title: 'Travel Essentials', difficulty: Difficulty.B1 },
    ];

    for (const cat of categories) {
      const category = await this.prisma.flashcardCategory.upsert({
        where: { id: categories.indexOf(cat) + 1 },
        update: cat,
        create: cat,
      });

      if (cat.title === 'Common Italian Verbs') {
        const cards = [
          { frontText: 'To be', backText: 'Essere' },
          { frontText: 'To have', backText: 'Avere' },
          { frontText: 'To go', backText: 'Andare' },
        ];
        for (const card of cards) {
          await this.prisma.card.upsert({
            where: { id: cards.indexOf(card) + 1 },
            update: { ...card, categoryId: category.id },
            create: { ...card, categoryId: category.id },
          });
        }
      }
    }
    this.logger.log('Flashcard categories and sample cards seeded.');
  }

  // ========================
  // 6. Seed Lessons
  // ========================
  async seedLessons() {
    this.logger.log('Starting lesson seeding...');

    const lessons = [
      {
        lesson_title: 'Introduction to Italian Greetings',
        topic: 'Greetings',
        skill: LessonType.SPEAKING,
        level: 'A1',
        difficulty: 'Beginner',
        isPublished: true,
        target_language: 'Italian',
        native_language: 'English',
        task_time: 10,
        section_total: 5,
      },
      {
        lesson_title: 'Ordering at a Restaurant',
        topic: 'Dining',
        skill: LessonType.LISTENING,
        level: 'A2',
        difficulty: 'Elementary',
        isPublished: true,
        target_language: 'Italian',
        native_language: 'English',
        task_time: 15,
        section_total: 8,
      },
      {
        lesson_title: 'Italian Past Tense',
        topic: 'Grammar',
        skill: LessonType.GRAMMAR,
        level: 'B1',
        difficulty: 'Intermediate',
        isPublished: true,
        target_language: 'Italian',
        native_language: 'English',
        task_time: 20,
        section_total: 10,
      },
    ];

    for (const lessonData of lessons) {
      const lesson = await this.prisma.lesson.create({
        data: lessonData,
      });

      // Seed a sample question set for each lesson
      await this.prisma.questionSet.create({
        data: {
          lessonId: lesson.id,
          prompt: `Sample prompt for ${lesson.lesson_title}`,
          content: {
            questions: [
              { q: 'How do you say "Hello"?', a: 'Buongiorno' },
              { q: 'How do you say "Goodbye"?', a: 'Arrivederci' },
            ],
          },
        },
      });
    }
    this.logger.log(`Seeded ${lessons.length} lessons with question sets.`);
  }

  // ========================
  // 7. Seed Integration Credentials
  // ========================
  async seedIntegrationCredentials() {
    this.logger.log('Starting integration credentials seeding...');

    const integrations: {
      provider: CredentialProvider;
      payload: Record<string, any>;
    }[] = [
      {
        provider: CredentialProvider.OPENAI,
        payload: {
          api_key: 'sk-proj-aB1c2D3e4F5g6H7i8J9k0L1m2N3o4P5q6R7s8T9u0V1w2X3y4Z',
          model_name: 'gpt-4o',
          organization_id: 'org-premium-ai-solutions',
        },
      },
      {
        provider: CredentialProvider.GEMINI,
        payload: {
          api_key: 'AIzaSyD1e2F3g4H5i6J7k8L9m0N1o2P3q4R5s6T',
          model_name: 'gemini-1.5-pro',
        },
      },
      {
        provider: CredentialProvider.GROK,
        payload: {
          api_key: 'xai-9k8j7h6g5f4d3s2a1q2w3e4r5t6y7u8i9o0p',
          model_name: 'grok-1',
        },
      },
      {
        provider: CredentialProvider.STRIPE,
        payload: {
          secret_key: 'sk_test_51O1234567890abcdefghijklmnopqrstuvwxyz',
          publishable_key: 'pk_test_51O1234567890abcdefghijklmnopqrstuvwxyz',
          webhook_secret: 'whsec_abcdef1234567890abcdef1234567890',
        },
      },
      {
        provider: CredentialProvider.LEMONSQUEEZY,
        payload: {
          api_key:
            'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
          store_id: '259513',
          webhook_secret: 'ls_wh_9876543210fedcba9876543210',
          variant_id: '1164228',
        },
      },
      {
        provider: CredentialProvider.CLOUDINARY,
        payload: {
          cloud_name: 'dpehzj6yv',
          api_key: '187676878738782',
          api_secret: '9xPLvDHDYyhzy2AfCToIEzGaGk0',
        },
      },
    ];

    for (const integration of integrations) {
      const normalizedPayload = JSON.stringify(
        Object.fromEntries(Object.entries(integration.payload).sort()),
      );

      const payloadHash = createHash('sha256')
        .update(normalizedPayload)
        .digest('hex');

      const encryptedPayload =
        this.encryptionService.encrypt(normalizedPayload);

      await this.prisma.integrationCredential.upsert({
        where: { provider: integration.provider },
        update: {
          encryptedPayload,
          payloadHash,
          fieldNames: Object.keys(integration.payload).sort(),
          isActive: true,
          lastRotatedAt: new Date(),
        },
        create: {
          provider: integration.provider,
          encryptedPayload,
          payloadHash,
          fieldNames: Object.keys(integration.payload).sort(),
          isActive: true,
          lastRotatedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Seeded ${integrations.length} integration credentials successfully.`,
    );
  }
}
