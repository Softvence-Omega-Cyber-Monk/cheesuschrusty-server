import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role, SubscriptionPlan } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CreatePlatformUserDto } from './dto/create-admin.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
 /**
   * Get all students with optional filters, search, and pagination
   */
async getAllStudents(
  page = 1,
  limit = 20,
  search?: string,
  isActive?: boolean,
  subscription?: 'PRO' | 'FREE'
) {
  const skip = (page - 1) * limit;

  const whereClause: any = { role: 'USER' };
  if (typeof isActive === 'boolean') whereClause.isActive = isActive;
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Fetch users from DB
  const [total, users] = await this.prisma.$transaction([
    this.prisma.user.count({ where: whereClause }),
    this.prisma.user.findMany({
      where: whereClause,
      include: { subscriptions: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const now = new Date();

  // Compute subscriptionPlan and trialAvailable
  let data = users.map((u) => {
    const activePro = u.subscriptions.some(
      (s) =>
        s.plan === 'PRO' &&
        s.status !== 'canceled' &&
        new Date(s.currentPeriodEnd) > now
    );

    return {
      id: u.id,
      email: u.email,
      emailVerified: u.emailVerified,
      name: u.name,
      avatar: u.avatar,
      isActive: u.isActive,
      hasUsedTrial: u.hasUsedTrial,
      role: u.role,
      nativeLang: u.nativeLang,
      targetLang: u.targetLang,
      currentLevel: u.currentLevel,
      xp: u.xp,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
      lastPracticeDate: u.lastPracticeDate,
      totalMinutesStudied: u.totalMinutesStudied,
      wordsLearned: u.wordsLearned,
      lessonsCompleted: u.lessonsCompleted,
      dailyGoalMinutes: u.dailyGoalMinutes,
      timezone: u.timezone,
      stripeCustomerId: u.stripeCustomerId,
      subscriptions: u.subscriptions || [],
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,

      subscriptionPlan: activePro ? 'PRO' : 'FREE',
      trialAvailable: !u.hasUsedTrial && !activePro,
    };
  });

  // Filter by subscription if provided
  if (subscription) {
    data = data.filter((u) => u.subscriptionPlan === subscription);
  }

  return {
    data,
    meta: {
      total: data.length,
      page,
      limit,
      totalPages: Math.ceil(data.length / limit),
    },
  };
}


/**
 * Get a single user by ID
 */
async getUserById(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: true },
  });

  if (!user) throw new NotFoundException(`User ${userId} not found`);

  const now = new Date();
const activePro = user.subscriptions.some(
  (s) =>
    s.plan === 'PRO' &&
    s.status !== 'canceled' &&  // ignore only fully canceled
    new Date(s.currentPeriodEnd) > now
);

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    avatar: user.avatar,
    isActive: user.isActive,
    hasUsedTrial: user.hasUsedTrial,
    role: user.role,
    nativeLang: user.nativeLang,
    targetLang: user.targetLang,
    currentLevel: user.currentLevel,
    xp: user.xp,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastPracticeDate: user.lastPracticeDate,
    totalMinutesStudied: user.totalMinutesStudied,
    wordsLearned: user.wordsLearned,
    lessonsCompleted: user.lessonsCompleted,
    dailyGoalMinutes: user.dailyGoalMinutes,
    timezone: user.timezone,
    stripeCustomerId: user.stripeCustomerId,
    subscriptions: user.subscriptions || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,

    // Computed fields
    subscriptionPlan: activePro ? 'PRO' : 'FREE',
    trialAvailable: !user.hasUsedTrial && !activePro,
  };
}
  /**
   * Suspend or activate a user
   */
  async toggleUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    return updated;
  }

  /**
   * Hard delete user (super admin only)
   */
  async deleteUser(userId: string, role: Role) {
    if (role !== Role.SUPER_ADMIN) throw new ForbiddenException('Unauthorized');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    await this.prisma.user.delete({ where: { id: userId } });
    return { message: `User ${userId} deleted successfully` };
  }

  /**
   * Get all platform users (content manager, support manager)
   */
  async getPlatformUsers(
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const whereClause: Prisma.UserWhereInput = {
      role: { in: [Role.CONTENT_MANAGER, Role.SUPORT_MANAGER] },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const total = await this.prisma.user.count({ where: whereClause });

    const users = await this.prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Create a new platform user (content manager / support manager)
   */
  async createPlatformUser(
   dto:CreatePlatformUserDto
  ) {
    if (![Role.CONTENT_MANAGER, Role.SUPORT_MANAGER].includes(dto.role)) {
      throw new ForbiddenException('Invalid role for platform user');
    }

    const user = await this.prisma.user.create({
      data: { email:dto.email, name:dto.name, role:dto.role, isActive: true },
    });

    return user;
  }


  async getUserMetaData() {
    const now = new Date();

    const [totalUsers, activeUsers, suspendedUsers, proUsers] = await this.prisma.$transaction([
      this.prisma.user.count(), // total users
      this.prisma.user.count({ where: { isActive: true } }), // active users
      this.prisma.user.count({ where: { isActive: false } }), // suspended users
      this.prisma.user.count({
        where: {
          subscriptions: {
            some: {
              plan: 'PRO',
              status: { notIn: ['canceled', 'canceled_at_period_end'] },
              currentPeriodEnd: { gt: now },
            },
          },
        },
      }), // pro users
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      proUsers,
    };
  }
}
