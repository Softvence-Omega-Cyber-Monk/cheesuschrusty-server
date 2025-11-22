import { Injectable } from '@nestjs/common';

@Injectable()
export class MailTemplatesService {


async getEmailVerificationOtpTemplate(
  otpCode: string,
  expirationMinutes = 5
): Promise<string> {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email Verification</title>
<style>
  body { margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f4f4f4; }
  .container { width:100%; padding:20px; }
  .email-card { max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e0e0e0; }
  .header { background:#556080; padding:30px 20px; text-align:center; color:#fff; }
  .header h1 { margin:0; font-size:24px; }
  .content { padding:20px 30px; text-align:center; color:#333; }
  .otp { font-size:28px; font-weight:bold; color:#556080; margin:20px 0; letter-spacing:4px; }
  .footer { font-size:12px; color:#888; text-align:center; padding:20px; background:#f9f9f9; }
  .note { font-size:14px; color:#555; margin-top:15px; }
</style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <h1>Email Verification</h1>
      </div>

      <div class="content">
        <p>Thank you for registering! Use the OTP below to verify your email address:</p>
        <div class="otp">${otpCode}</div>
        <p class="note">This OTP is valid for <strong>${expirationMinutes} minutes</strong> and should not be shared with anyone.</p>
      </div>

      <div class="footer">© 2025 B1 Italian. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
}

// ✅ New template for Reset Password OTP
  async getResetPasswordOtpTemplate(
    otpCode: string,
    expirationMinutes = 5
  ): Promise<string> {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset Password</title>
<style>
  body { margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f4f4f4; }
  .container { width:100%; padding:20px; }
  .email-card { max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e0e0e0; }
  .header { background:#d9534f; padding:30px 20px; text-align:center; color:#fff; }
  .header h1 { margin:0; font-size:24px; }
  .content { padding:20px 30px; text-align:center; color:#333; }
  .otp { font-size:28px; font-weight:bold; color:#d9534f; margin:20px 0; letter-spacing:4px; }
  .footer { font-size:12px; color:#888; text-align:center; padding:20px; background:#f9f9f9; }
  .note { font-size:14px; color:#555; margin-top:15px; }
</style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <h1>Reset Your Password</h1>
      </div>

      <div class="content">
        <p>We received a request to reset your password. Use the OTP below to proceed:</p>
        <div class="otp">${otpCode}</div>
        <p class="note">This OTP is valid for <strong>${expirationMinutes} minutes</strong> and should not be shared with anyone.</p>
      </div>

      <div class="footer">© 2025 B1 Italian. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
  }

}