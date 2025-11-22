// import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { Role } from '@prisma/client';
// import { CreateAdminDto } from './dto/create-admin.dto';
// import * as bcrypt from 'bcrypt';

// @Injectable()
// export class UserService {
//   constructor(private prisma: PrismaService) {}

//   async createAdmin(dto: CreateAdminDto) {
//     const existing = await this.prisma.user.findUnique({
//       where: { email: dto.email },
//     });

//     if (existing) throw new BadRequestException('Email already in use');

//     const hashedPassword = await bcrypt.hash(dto.password, 10);

//     const admin = await this.prisma.user.create({
//       data: {
//         email: dto.email,
//         password: hashedPassword,
//         role: Role.ADMIN,
//       },
//     });

//     return {
//       id: admin.id,
//       email: admin.email,
//       role: admin.role,
//     };
//   }

//   async getAllUser() {
//    const users = await this.prisma.user.findMany({
//     include: {
//       payment: {
//         orderBy: { createdAt: 'desc' }, // ensures latest is first
//       },
//     },
//   });

//   return users.map(user => {
//     const latestPayment = user.payment[0]; // most recent
//     const isActive = latestPayment
//       ? isSubscriptionActive(latestPayment.createdAt, latestPayment.durationDays ?? 0)
//       : false;

//     return {
//       id: user.id,
//       userName: user.userName,
//       email: user.email,
//       role: user.role,
//       status: user.status,
//       createdAt: user.createdAt,
//       hasActiveSubscription: isActive,
//       latestPaymentDate: latestPayment?.createdAt ?? null,
//       paymentDurationDays: latestPayment?.durationDays ?? null,
//       totalPayments: user.payment.length,
//       isBlocked:user.isBlocked
//     };
//   });
//   }

//   async updateUserBlockStatus(userId: string, isBlocked: boolean) {
//     const user = await this.prisma.user.findUnique({ where: { id: userId } });
//     if (!user) throw new NotFoundException('User not found');
//     if(user.role==="SUPER_ADMIN"){
//       throw new BadRequestException("Super admin can not be blocked!")
//     }
//     return this.prisma.user.update({
//       where: { id: userId },
//       data: { isBlocked },
//     });
//   }

    
// }
