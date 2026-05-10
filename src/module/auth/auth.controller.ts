import {
  Body,
  Controller,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import sendResponse from '../utils/sendResponse';
import { Public } from 'src/common/decorators/public.decorators';
import {
  RequestResetCodeDto,
  ResetPasswordDto,
  VerifyResetCodeDto,
} from './dto/forget-reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Request, Response } from 'express';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ✅ Register - Now only sends verification email
  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user account.',
    description: `Creates a user in 'PENDING' status and sends a 6-digit OTP to their email.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/auth/register \\
    -H "Content-Type: application/json" \\
    -d '{"email": "user@example.com", "password": "Password123!", "name": "John Doe"}'
    \`\`\``
  })
  @ApiResponse({
    status: 201,
    description: 'User created. Verification email sent.',
    schema: {
      example: {
        statusCode: 201,
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: { email: 'user@example.com' }
      }
    }
  })
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: result,
    });
  }

  // ✅ Verify Email - New endpoint
  @Public()
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email using the OTP code sent during registration.',
    description: `Activates the user account.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/auth/verify-email \\
    -H "Content-Type: application/json" \\
    -d '{"email": "user@example.com", "code": "123456"}'
    \`\`\``
  })
  @ApiResponse({ status: 200, description: 'Email verified.' })
  async verifyEmail(@Body() dto: VerifyResetCodeDto, @Res() res: Response) {
    const result = await this.authService.verifyEmail(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Email verified successfully',
      data: result,
    });
  }

  // ✅ Resend Verification OTP - New endpoint
  @Public()
  @Post('resend-verification')
  @ApiOperation({
    summary: 'Resend verification OTP.',
    description: `Triggers a new verification email for a 'PENDING' user.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/auth/resend-verification \\
    -H "Content-Type: application/json" \\
    -d '{"email": "user@example.com"}'
    \`\`\``
  })
  @ApiResponse({ status: 200, description: 'Code sent.' })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Res() res: Response,
  ) {
    const result = await this.authService.resendVerificationOtp(dto.email);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Verification code sent',
      data: result,
    });
  }

  // login
  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Authenticate user and receive JWT tokens.',
    description: `Returns an Access Token (short-lived) and a Refresh Token (long-lived).
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"email": "user@example.com", "password": "Password123!"}'
    \`\`\``
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'eyJhbGc...',
          refreshToken: 'def456...',
          user: { id: 'uuid', email: 'user@example.com', role: 'USER' }
        }
      }
    }
  })
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Login successful',
      data: result,
    });
  }

  // refresh token
  @Public()
  @Post('refresh-token')
  @ApiOperation({
    summary: 'Refresh access tokens.',
    description: `Exchange a valid refresh token for a new set of tokens.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/auth/refresh-token \\
    -H "Content-Type: application/json" \\
    -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
    \`\`\``
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: { accessToken: 'new-at...', refreshToken: 'new-rt...' }
      }
    }
  })
  async refreshToken(@Body() dto: RefreshTokenDto, @Res() res: Response) {
    const result = await this.authService.refreshTokens(dto.refreshToken);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Token refreshed',
      data: result,
    });
  }

  // change password
  @Patch('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.changePassword(req.user!.email, dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Password changed',
      data: result,
    });
  }

  // forget and reset password
  @Public()
  @Post('request-reset-code')
  @ApiOperation({
    summary: 'Request a password reset code.',
    description: `Sends a 6-digit OTP to the user's email if they forgot their password.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/auth/request-reset-code \\
    -H "Content-Type: application/json" \\
    -d '{"email": "user@example.com"}'
    \`\`\``
  })
  @ApiResponse({ status: 200, description: 'Reset code sent.' })
  async requestResetCode(
    @Body() dto: RequestResetCodeDto,
    @Res() res: Response,
  ) {
    const result = await this.authService.requestResetCode(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Reset code sent',
      data: result,
    });
  }

  @Public()
  @Post('verify-reset-code')
  @ApiOperation({
    summary: 'Verify a password reset code.',
    description: `Check if the OTP sent via email is correct.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/auth/verify-reset-code \\
    -H "Content-Type: application/json" \\
    -d '{"email": "user@example.com", "code": "123456"}'
    \`\`\``
  })
  @ApiResponse({ status: 200, description: 'Code verified.' })
  async verifyResetCode(@Body() dto: VerifyResetCodeDto, @Res() res: Response) {
    const result = await this.authService.verifyResetCode(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'OTP verified',
      data: result,
    });
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password using verified token.',
    description: `Finalize password recovery by setting a new password.
    **Curl Example:**
    \`\`\`bash
    curl -X POST http://localhost:5001/api/v1/auth/reset-password \\
    -H "Content-Type: application/json" \\
    -d '{"email": "user@example.com", "password": "NewPassword123!", "code": "123456"}'
    \`\`\``
  })
  @ApiResponse({ status: 200, description: 'Password reset successful.' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Res() res: Response) {
    const result = await this.authService.resetPassword(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Password reset successful',
      data: result,
    });
  }
}
