// src/auth/utils/auth-utils.ts

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

export async function getTokens(
  jwtService: JwtService,
  userId: string,
  email: string,
  role: string,
  sessionTimeoutDays?: number,
) {

   const expiresIn = sessionTimeoutDays ? sessionTimeoutDays * 24 * 60 * 60 : parseInt(process.env.ACCESS_TOKEN_EXPIREIN!);
  const [access_token, refresh_token] = await Promise.all([
    jwtService.signAsync({ id: userId, email, role }, {
      secret: process.env.ACCESS_TOKEN_SECRET,
     expiresIn, 
    }),
    jwtService.signAsync({ id: userId, email, role }, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: process.env.REFRESH_TOKEN_EXPIREIN,
    }),
  ]);

  return { access_token, refresh_token };
}

export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 100000–999999
}

export async function hashOtpCode(code: string) {
  return bcrypt.hash(code, parseInt(process.env.SALT_ROUND!));
}


export async function verifyOtp(
  prisma: PrismaClient,
  email: string,
  code: string,
) {
  const otpRecord = await prisma.otpCode.findFirst({
    where: { email, verified: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    throw new BadRequestException('Invalid or expired code');
  }

  const isValid = await bcrypt.compare(code, otpRecord.code);
  if (!isValid) {
    throw new BadRequestException('Incorrect code');
  }

  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { verified: true },
  });

  return { message: 'OTP verified successfully' };
}



export function validatePassword(password: string, settings: {
  minPasswordLength?: number,
  requireSpecialChars?: boolean,
  requireUppercaseLetters?: boolean,
}) {
  const { minPasswordLength = 8, requireSpecialChars = true, requireUppercaseLetters = true } = settings;

  if (password.length < minPasswordLength) {
    throw new BadRequestException(`Password must be at least ${minPasswordLength} characters long.`);
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new BadRequestException('Password must include at least one special character.');
  }

  if (requireUppercaseLetters && !/[A-Z]/.test(password)) {
    throw new BadRequestException('Password must include at least one uppercase letter.');
  }

  return true;
}