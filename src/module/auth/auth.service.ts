import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
import {
  generateOtpCode,
  getTokens,
  hashOtpCode,
  validatePassword,
  verifyOtp,
} from './auth.utils';
import { MailService } from '../mail/mail.service';
import { MailTemplatesService } from '../mail/mail.template';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailService,
    private mailTemplatesService: MailTemplatesService,
    private notificationSettingsService: NotificationSettingsService,
  ) {}

  async register(dto: RegisterDto) {
    // ✅ Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered!');
    }

    // ✅ Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new BadRequestException('Username is already taken!');
    }

    // ✅ Get security settings with fallback to defaults
    const securitySettings = await this.prisma.securitySettings.findUnique({
      where: { id: 1 },
    });

    // Validate password with proper null handling
    if (securitySettings) {
      validatePassword(dto.password, securitySettings);
    } else {
      // Use default validation if no security settings exist
      this.logger.warn(
        'SecuritySettings not found, using default password validation',
      );
      validatePassword(dto.password, {
        minPasswordLength: 8,
        requireSpecialChars: true,
        requireUppercaseLetters: true,
      });
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      parseInt(process.env.SALT_ROUND || '10'),
    );

    const newUser = await this.prisma.user.create({
      data: {
        name: dto.name,
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        emailVerified: false,
        role: dto.role || 'USER', // ✅ Provide default role
        dailyGoalMinutes: dto.dailyGoalMinutes,
      },
    });

    // Generate OTP for email verification
    const code = generateOtpCode();

    console.log("OTP:", code);
    const hashedCode = await hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to DB
    await this.prisma.otpCode.create({
      data: { email: newUser.email, code: hashedCode, expiresAt },
    });

    // Send verification email
    const html =
      await this.mailTemplatesService.getEmailVerificationOtpTemplate(code, 10);

    try {
      await this.mailerService.sendMail({
        to: newUser.email,
        subject: 'Verify Your Email - ProntoCorso',
        html,
      });
      this.logger.log(`Verification email sent to ${newUser.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${newUser.email}`,
        error,
      );

      // 🔥 PRODUCTION MARK: In production, we MUST delete the user and throw error.
      // In development, we allow the registration to complete so you can test other things.
      if (process.env.ENVIRONMENT === 'development') {
        console.warn('⚠️ DEVELOPMENT: Email failed, but keeping user from being deleted.');
        return {
          message: 'Registration successful! (Email skipped due to dev error)',
          email: newUser.email,
          username: newUser.username,
        };
      }

      // Clean up user if email fails (ONLY IN PRODUCTION)
      await this.prisma.user.delete({ where: { id: newUser.id } });
      throw new BadRequestException(
        'Failed to send verification email. Please try again.',
      );
    }

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      email: newUser.email,
      username: newUser.username,
    };
  }

  // ✅ Verify email with OTP
  async verifyEmail(dto: VerifyResetCodeDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Verify OTP
    await verifyOtp(this.prisma, dto.email, dto.code);

    // Update user to verified
    await this.prisma.user.update({
      where: { email: dto.email },
      data: { emailVerified: true },
    });

    // Delete used OTP codes for this email
    await this.prisma.otpCode.deleteMany({ where: { email: dto.email } });

    // ✅ Get security settings with fallback
    const securitySettings = await this.prisma.securitySettings.findUnique({
      where: { id: 1 },
    });
    const sessionTimeoutMs = securitySettings?.sessionTimeoutDays
      ? securitySettings.sessionTimeoutDays * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000; // Default 1 day

    // Generate tokens
    const tokens = await getTokens(
      this.jwtService,
      user.id,
      user.email,
      user.role,
      sessionTimeoutMs,
    );

    // Send welcome email if globally enabled
    try {
      const notificationSettings =
        await this.notificationSettingsService.getSettings();
      if (notificationSettings?.welcomeEmailEnabled) {
        await this.mailerService.sendWelcomeEmail({
          email: user.email,
          name: user.name || 'User',
        });
        this.logger.log(`Welcome email sent to ${user.email}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${user.email}`, error);
      // Don't fail verification if welcome email fails
    }

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  // ✅ Resend verification OTP
  async resendVerificationOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Delete old OTP codes for this email
    await this.prisma.otpCode.deleteMany({ where: { email } });

    // Generate new OTP
    const code = generateOtpCode();
    const hashedCode = await hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save new OTP to DB
    await this.prisma.otpCode.create({
      data: { email, code: hashedCode, expiresAt },
    });

    // Send verification email
    const html =
      await this.mailTemplatesService.getEmailVerificationOtpTemplate(code, 10);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify Your Email - ProntoCorso',
        html,
      });
      this.logger.log(`Verification email resent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to resend verification email to ${email}`,
        error,
      );
      throw new BadRequestException(
        'Failed to send verification email. Please try again.',
      );
    }

    return { message: 'Verification code sent to your email' };
  }

  // ✅ Login with improved error handling
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new ForbiddenException('Invalid credentials');
    }

    // ✅ Check if email is verified
    if (!user.emailVerified) {
      throw new BadRequestException(
        'Please verify your email before logging in. Check your inbox for the verification code.',
      );
    }

    if (!user.isActive) {
      throw new BadRequestException('User is blocked!');
    }

    // ✅ Get security settings with fallback
    const securitySettings = await this.prisma.securitySettings.findUnique({
      where: { id: 1 },
    });
    const maxAttempts = securitySettings?.maxLoginAttempts || 5;
    const sessionTimeoutMs =
      (securitySettings?.sessionTimeoutDays || 1) * 24 * 60 * 60 * 1000;
    const lockDurationMs = 15 * 60 * 1000; // 15 minutes

    // Check if account is temporarily locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new BadRequestException(
        `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };

      // Lock account if max attempts reached
      if (failedAttempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + lockDurationMs);
        updateData.failedLoginAttempts = 0;
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      const attemptsLeft = maxAttempts - failedAttempts;
      throw new ForbiddenException(
        attemptsLeft <= 0
          ? `Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.`
          : `Invalid credentials. ${attemptsLeft} attempt(s) left.`,
      );
    }

    // Reset failed attempts and lock on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens using session timeout
    const tokens = await getTokens(
      this.jwtService,
      user.id,
      user.email,
      user.role,
      sessionTimeoutMs,
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        dailyGoalMinutes: user.dailyGoalMinutes,
      },
      ...tokens,
    };
  }

  // ✅ Refresh token with improved error handling
  async refreshTokens(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (!user.isActive) {
        throw new BadRequestException('User is blocked!');
      }

      // ✅ Check if email is verified
      if (!user.emailVerified) {
        throw new UnauthorizedException('Email not verified');
      }

      // ✅ Get session timeout with fallback
      const securitySettings = await this.prisma.securitySettings.findUnique({
        where: { id: 1 },
      });
      const sessionTimeoutMs =
        (securitySettings?.sessionTimeoutDays || 1) * 24 * 60 * 60 * 1000;

      return getTokens(
        this.jwtService,
        user.id,
        user.email,
        user.role,
        sessionTimeoutMs,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ✅ Change password with improved validation
  async changePassword(email: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User is blocked!');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }

    // ✅ Fetch security rules with fallback
    const securitySettings = await this.prisma.securitySettings.findUnique({
      where: { id: 1 },
    });

    if (securitySettings) {
      validatePassword(dto.newPassword, securitySettings);
    } else {
      validatePassword(dto.newPassword, {
        minPasswordLength: 8,
        requireSpecialChars: true,
        requireUppercaseLetters: true,
      });
    }

    const hashed = await bcrypt.hash(
      dto.newPassword,
      parseInt(process.env.SALT_ROUND || '10'),
    );
    await this.prisma.user.update({
      where: { email },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }

  // ✅ Request reset code
  async requestResetCode(dto: RequestResetCodeDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User is blocked!');
    }

    // Delete old OTP codes for this email
    await this.prisma.otpCode.deleteMany({ where: { email: dto.email } });

    // Generate OTP
    const code = generateOtpCode();
    const hashedCode = await hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to DB
    await this.prisma.otpCode.create({
      data: { email: dto.email, code: hashedCode, expiresAt },
    });

    // Generate HTML template
    const html = await this.mailTemplatesService.getResetPasswordOtpTemplate(
      code,
      5,
    );

    // Send email
    try {
      await this.mailerService.sendMail({
        to: dto.email,
        subject: 'Reset Password Code - ProntoCorso',
        html,
      });
      this.logger.log(`Password reset code sent to ${dto.email}`);
    } catch (error) {
      this.logger.error(`Failed to send reset code to ${dto.email}`, error);
      throw new BadRequestException(
        'Failed to send reset code. Please try again.',
      );
    }

    return { message: 'Reset code sent to your email' };
  }

  async verifyResetCode(dto: VerifyResetCodeDto) {
    return verifyOtp(this.prisma, dto.email, dto.code);
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
      throw new BadRequestException(
        'OTP not verified. Please verify the code first.',
      );
    }

    // ✅ Fetch security rules with fallback
    const securitySettings = await this.prisma.securitySettings.findUnique({
      where: { id: 1 },
    });

    if (securitySettings) {
      validatePassword(dto.password, securitySettings);
    } else {
      validatePassword(dto.password, {
        minPasswordLength: 8,
        requireSpecialChars: true,
        requireUppercaseLetters: true,
      });
    }

    const hashed = await bcrypt.hash(
      dto.password,
      parseInt(process.env.SALT_ROUND || '10'),
    );
    await this.prisma.user.update({
      where: { email: dto.email },
      data: { password: hashed },
    });

    // Clean up all OTP codes for this email
    await this.prisma.otpCode.deleteMany({ where: { email: dto.email } });

    return { message: 'Password reset successful' };
  }
}
