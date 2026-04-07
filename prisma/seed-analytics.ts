import { PrismaClient, SubscriptionPlan, LessonType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting full analytics data seeding with uppercase Enums...');

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  // 1. Create Lessons
  console.log('📚 Seeding lessons across different skill areas and levels...');
  const skillTypes = [
    LessonType.LISTENING, 
    LessonType.READING, 
    LessonType.WRITING, 
    LessonType.SPEAKING, 
    LessonType.GRAMMAR
  ];
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  
  const createdLessons: any[] = [];
  for (let i = 1; i <= 30; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const skill = skillTypes[i % 5];
    const lesson = await prisma.lesson.create({
      data: {
        topic: `Topic ${i}: ${skill} mastery`,
        lesson_title: `Lesson ${i}`,
        skill: skill, 
        level: level,
        difficulty: level,
        isPublished: true,
        is_pro: i > 15,
        createdAt: new Date(sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime())),
      }
    });
    createdLessons.push(lesson);
  }

  // 2. Create Users
  console.log('👥 Seeding 100 users...');
  const channels = ['google', 'facebook', 'instagram', 'twitter', 'linkedin'];
  const createdUsers: any[] = [];
  
  for (let i = 1; i <= 100; i++) {
    const joinedAt = new Date(sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime()));
    const utmSource = channels[Math.floor(Math.random() * channels.length)];
    
    const user = await prisma.user.create({
      data: {
        email: `analytics_user${i}@example.com`,
        username: `analytics_user_${i}_${Math.floor(Math.random() * 1000)}`,
        name: `Analytics Mock User ${i}`,
        isActive: true,
        createdAt: joinedAt,
        utmSource: utmSource,
        utmMedium: Math.random() > 0.5 ? 'cpc' : 'organic',
        acquisitionChannel: i % 8 === 0 ? 'Word of Mouth' : undefined,
      } as any,
    });
    createdUsers.push(user);
  }

  // 3. Create Practice Sessions
  console.log('⚡ Generating 1000+ practice sessions...');
  for (const user of createdUsers) {
    const sessionsForUser = 5 + Math.floor(Math.random() * 15);
    for (let i = 0; i < sessionsForUser; i++) {
      const lesson = createdLessons[Math.floor(Math.random() * createdLessons.length)];
      const completedAt = new Date(user.createdAt.getTime() + Math.random() * (now.getTime() - user.createdAt.getTime()));
      
      await prisma.practiceSession.create({
        data: {
          userId: user.id,
          lessonId: lesson.id,
          skillArea: lesson.skill || 'LISTENING',
          accuracy: 60 + Math.random() * 40,
          durationSeconds: 300 + Math.floor(Math.random() * 1200),
          xpEarned: 20 + Math.floor(Math.random() * 80),
          completedAt: completedAt,
        }
      });
    }
  }

  // 4. Marketing Spend for CAC
  console.log('💰 Seeding marketing spend...');
  for (let i = 0; i < 90; i++) {
    const recordedAt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    await prisma.integrationUsageStat.create({
      data: {
        provider: 'OPENAI',
        operation: 'search_ads_spend',
        requestCount: 1,
        costUsd: 15 + Math.random() * 85,
        recordedAt: recordedAt,
      }
    });
  }

  // 5. Subscription Data
  console.log('💳 Generating revenue history...');
  const monthlyPrice = 29.99;
  
  for (const user of createdUsers) {
    if (Math.random() > 0.4) { // 60% of users joined PRO
      const subStart = new Date(user.createdAt.getTime() + 1 * 24 * 60 * 60 * 1000);
      const isStillActive = Math.random() > 0.35; // 65% retention pattern
      
      try {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            status: isStillActive ? 'active' : 'canceled',
            plan: SubscriptionPlan.PRO,
            planAlias: 'pro-monthly',
            currentPeriodStart: subStart,
            currentPeriodEnd: new Date(subStart.getTime() + 31 * 24 * 60 * 60 * 1000),
            createdAt: subStart,
            cancellationReason: isStillActive ? null : 'Product too advanced',
          }
        });

        await prisma.subscriptionHistory.create({
          data: {
            userId: user.id,
            event: 'NEW',
            planAlias: 'pro-monthly',
            status: 'active',
            price: monthlyPrice,
            mrrContribution: monthlyPrice,
            recordedAt: subStart,
          }
        });

        const monthsActive = isStillActive ? 5 : 1 + Math.floor(Math.random() * 4);
        for (let m = 1; m < monthsActive; m++) {
          const renewalAt = new Date(subStart.getTime() + m * 30 * 24 * 60 * 60 * 1000);
          if (renewalAt > now) break;
          
          await prisma.subscriptionHistory.create({
            data: {
              userId: user.id,
              event: 'RENEWAL',
              planAlias: 'pro-monthly',
              status: 'active',
              price: monthlyPrice,
              mrrContribution: monthlyPrice,
              recordedAt: renewalAt,
            }
          });
        }

        if (!isStillActive) {
          const churnAt = new Date(subStart.getTime() + monthsActive * 30 * 24 * 60 * 60 * 1000);
          if (churnAt < now) {
            await prisma.subscriptionHistory.create({
              data: {
                userId: user.id,
                event: 'CHURN',
                planAlias: 'pro-monthly',
                status: 'canceled',
                price: monthlyPrice,
                mrrContribution: 0,
                recordedAt: churnAt,
                cancellationReason: 'I only needed it for 1 month',
              }
            });
          }
        }
      } catch (err) {}
    }
  }

  console.log('\n✅ Analytics Data Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
