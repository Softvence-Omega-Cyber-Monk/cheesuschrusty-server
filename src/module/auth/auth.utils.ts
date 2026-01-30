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
  sessionTimeoutMs?: number,
) {
  // ✅ Fixed: Convert milliseconds to seconds for JWT expiresIn
  // sessionTimeoutMs is in milliseconds, but JWT expects seconds
  const expiresInSeconds = sessionTimeoutMs 
    ? Math.floor(sessionTimeoutMs / 1000) 
    : parseInt(process.env.ACCESS_TOKEN_EXPIREIN || '3600');

  const [access_token, refresh_token] = await Promise.all([
    jwtService.signAsync(
      { id: userId, email, role }, 
      {
        secret: process.env.ACCESS_TOKEN_SECRET,
        expiresIn: expiresInSeconds,
      }
    ),
    jwtService.signAsync(
      { id: userId, email, role }, 
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_EXPIREIN || '7d',
      }
    ),
  ]);

  return { access_token, refresh_token };
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

export async function hashOtpCode(code: string): Promise<string> {
  const saltRounds = parseInt(process.env.SALT_ROUND || '10');
  return bcrypt.hash(code, saltRounds);
}

export async function verifyOtp(
  prisma: PrismaClient,
  email: string,
  code: string,
) {
  // Find the most recent unverified OTP for this email
  const otpRecord = await prisma.otpCode.findFirst({
    where: { email, verified: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    throw new BadRequestException('No verification code found. Please request a new one.');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new BadRequestException('Verification code has expired. Please request a new one.');
  }

  const isValid = await bcrypt.compare(code, otpRecord.code);
  if (!isValid) {
    throw new BadRequestException('Incorrect verification code. Please try again.');
  }

  // Mark OTP as verified
  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { verified: true },
  });

  return { message: 'OTP verified successfully' };
}

export function validatePassword(
  password: string, 
  settings: {
    minPasswordLength?: number;
    requireSpecialChars?: boolean;
    requireUppercaseLetters?: boolean;
  }
) {
  const { 
    minPasswordLength = 8, 
    requireSpecialChars = true, 
    requireUppercaseLetters = true 
  } = settings;

  if (password.length < minPasswordLength) {
    throw new BadRequestException(
      `Password must be at least ${minPasswordLength} characters long.`
    );
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new BadRequestException(
      'Password must include at least one special character (!@#$%^&*(),.?":{}|<>).'
    );
  }

  if (requireUppercaseLetters && !/[A-Z]/.test(password)) {
    throw new BadRequestException(
      'Password must include at least one uppercase letter.'
    );
  }

  return true;
}