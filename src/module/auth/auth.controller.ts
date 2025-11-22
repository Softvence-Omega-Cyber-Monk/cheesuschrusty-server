import { Body, Controller, HttpStatus, Patch, Post, Req, Res } from '@nestjs/common';
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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

// register 
  @Public()
  @Post('request-register-otp')
  async requestRegisterOtp(@Body('email') email: string, @Res() res: Response) {
    const result = await this.authService.requestRegisterOtp(email);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'OTP sent for registration',
      data: result,
    });
  }


  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(dto);
    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Registration successful',
      data: result,
    });
  }


  // login 
  @Public()
  @Post('login')
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
  async refreshToken(@Body('refreshToken') token: string, @Res() res: Response) {
    const result = await this.authService.refreshTokens(token);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Token refreshed',
      data: result,
    });
  }


  
  // change password 
  @Patch('change-password')
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request, @Res() res: Response) {
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
  async requestResetCode(@Body() dto: RequestResetCodeDto, @Res() res: Response) {
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
