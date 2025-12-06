import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/service/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import {
  RequestResetCodeDto,
  ResetPasswordDto,
  VerifyResetCodeDto,
} from './dto/forget-reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { generateOtpCode, getTokens, hashOtpCode, validatePassword, verifyOtp } from './auth.utils';
import { MailService } from '../mail/mail.service';
import { MailTemplatesService } from '../mail/mail.template';


@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailService,
    private mailTemplatesService: MailTemplatesService,
  ) {}

async register(dto: RegisterDto) {
  const existingUser = await this.prisma.user.findUnique({
    where: { email: dto.email },
  });

  if (existingUser) {
    throw new BadRequestException('Email is already registered!');
  }

  // Optional: Validate password based on SecuritySettings
  const securitySettings = await this.prisma.securitySettings.findUnique({ where: { id: 1 } });
  validatePassword(dto.password, securitySettings!);

  const hashedPassword = await bcrypt.hash(dto.password, parseInt(process.env.SALT_ROUND!));

  const newUser = await this.prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      emailVerified: true,
      dailyGoalMinutes: dto.dailyGoalMinutes,
    },
  });

  // Calculate session timeout in milliseconds
  const sessionTimeoutMs = securitySettings!.sessionTimeoutDays * 24 * 60 * 60 * 1000;

  const tokens = await getTokens(this.jwtService, newUser.id, newUser.email, newUser.role, sessionTimeoutMs);
  return { user: newUser, ...tokens };
}



// login 
async login(dto: LoginDto) {
  const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

  if (!user || !user.password) {
    throw new ForbiddenException('Invalid credentials');
  }

  if (!user.isActive) {
    throw new BadRequestException('User is blocked!');
  }

  // Get security settings
  const securitySettings = await this.prisma.securitySettings.findUnique({ where: { id: 1 } });
  const maxAttempts = securitySettings?.maxLoginAttempts || 5;
  const sessionTimeoutMs = (securitySettings?.sessionTimeoutDays || 1) * 24 * 60 * 60 * 1000; // days → ms
  const lockDurationMs = 15 * 60 * 1000; // 15 minutes lock on max attempts

  // Check if account is temporarily locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new BadRequestException(`Account temporarily locked. Try again in ${minutesLeft} minute(s).`);
  }

  const isMatch = await bcrypt.compare(dto.password, user.password);

  if (!isMatch) {
    // Increment failed attempts
    let failedAttempts = user.failedLoginAttempts + 1;
    const updateData: any = { failedLoginAttempts: failedAttempts };

    // Lock account if max attempts reached
    if (failedAttempts >= maxAttempts) {
      updateData.lockedUntil = new Date(Date.now() + lockDurationMs);
      updateData.failedLoginAttempts = 0; // reset after lock
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    throw new ForbiddenException(
      failedAttempts === 0
        ? `Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.`
        : `Invalid credentials. ${maxAttempts - failedAttempts} attempt(s) left.`
    );
  }

  // Reset failed attempts and lock on successful login
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null,lastLoginAt: new Date() },
    });
  }

  // Generate tokens using session timeout
  const tokens = await getTokens(this.jwtService, user.id, user.email, user.role, sessionTimeoutMs);

  return { user, ...tokens };
}



// refresh token 
  async refreshTokens(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      const user = await this.prisma.user.findUnique({ where: { email: payload.email } });
      if (!user) throw new UnauthorizedException('Invalid refresh token');
      if(!user.isActive){
       throw new BadRequestException('User is blocked!');
      }
      return getTokens(this.jwtService,user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }


// change password 
  async changePassword(email: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new NotFoundException('User not found');
    }
  if(!user.isActive){
      throw new BadRequestException('User is blocked!');
  }
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }

  // Fetch security rules
  const securitySettings = await this.prisma.securitySettings.findUnique({ where: { id: 1 } });

  // Validate new password
  validatePassword(dto.newPassword, securitySettings!);

    const hashed = await bcrypt.hash(dto.newPassword, parseInt(process.env.SALT_ROUND!) );
    await this.prisma.user.update({
      where: { email },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }



  // forget and reset password 
async requestResetCode(dto: RequestResetCodeDto) {
  const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) throw new NotFoundException('User not found');
  if (!user.isActive) {
    throw new BadRequestException('User is blocked!');
  }

  // Generate OTP
  const code = generateOtpCode(); // make sure this generates 6 digits
  const hashedCode = await hashOtpCode(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Save OTP to DB
  await this.prisma.otpCode.create({
    data: { email: dto.email, code: hashedCode, expiresAt },
  });

  // Generate HTML template
  const html = await this.mailTemplatesService.getResetPasswordOtpTemplate(code, 5);

  // Send email
  await this.mailerService.sendMail({
    to: dto.email,
    subject: 'Reset Password Code',
    html, // send HTML instead of plain text
  });

  return { message: 'Reset code sent' };
}


  async verifyResetCode(dto: VerifyResetCodeDto) {
    return verifyOtp(this.prisma,dto.email, dto.code);
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("Passwords don't match");
    }

    const verified = await this.prisma.otpCode.findFirst({
      where: { email: dto.email, verified: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!verified) {
      throw new BadRequestException('OTP not verified');
    }


     // Fetch security rules
  const securitySettings = await this.prisma.securitySettings.findUnique({ where: { id: 1 } });

  // Validate new password
   validatePassword(dto.password, securitySettings!);

    const hashed = await bcrypt.hash(dto.password, parseInt(process.env.SALT_ROUND!));
    await this.prisma.user.update({
      where: { email: dto.email },
      data: { password: hashed },
    });

    await this.prisma.otpCode.deleteMany({ where: { email: dto.email } });

    return { message: 'Password reset successful' };
  }

 
}
