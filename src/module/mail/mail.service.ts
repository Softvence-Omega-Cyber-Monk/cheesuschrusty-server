import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT), // 587
  secure: false, // STARTTLS for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

    }

    async sendMail(options: {
        to: string | string[];
        subject: string;
        html: string;
        from?: string;
        attachments?: nodemailer.Attachment[]; // 👈 RE-ADDED for image embedding
    }) {
        // Destructure attachments again
        const { to, subject, html, from, attachments } = options;
        const senderAddress = from || `B1 Italian<${process.env.SMTP_USER}>`;

        try {
            const info = await this.transporter.sendMail({
                from: senderAddress, 
                to,
                subject,
                html,
                attachments, // 👈 Included in the send call
            });
            console.log('Email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }




    private getFrom() {
    return `B1 Italian <${process.env.SMTP_USER}>`;
  }

  async sendWelcomeEmail(user: { email: string; name?: string | null }) {
    const name = user.name?.trim() || 'Learner';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to B1 Italian!</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: #003213; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; color: #333; }
          .btn { display: inline-block; background: #003213; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ciao ${name}! 🇮🇹</h1>
          </div>
          <div class="content">
            <h2>Welcome to B1 Italian!</h2>
            <p>You're now on your journey to mastering Italian for citizenship.</p>
            <p>Complete your first lesson today and start your streak! 🔥</p>
            <a href="${process.env.CLIENT_URL}" class="btn">Start Learning Now</a>
            <p>InshaAllah, you'll reach B1 soon!</p>
            <br>
            <p>The B1 Italian Team</p>
          </div>
          <div class="footer">
            © 2025 B1 Italian. All rights reserved.<br>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.getFrom(),
      to: user.email,
      subject: 'Welcome to B1 Italian! 🇮🇹',
      html,
    });
  }


// In MailService
async sendAchievementEmail(user: { email: string; name?: string | null }, badge: { title: string; icon: string; description: string }) {
  const name = user.name?.trim() || 'Learner';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Congratulations! New Badge Earned 🎉</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: #003213; color: white; padding: 30px; text-align: center; }
        .badge-icon { font-size: 60px; margin: 20px 0; }
        .content { padding: 30px; color: #333; text-align: center; }
        .btn { display: inline-block; background: #003213; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Congratulations, ${name}! 🎉</h1>
        </div>
        <div class="content">
          <div class="badge-icon">${badge.icon}</div>
          <h2>You earned a new badge!</h2>
          <h3>${badge.title}</h3>
          <p>${badge.description}</p>
          <p>Keep practicing — B1 citizenship is getting closer InshaAllah!</p>
          <a href="${process.env.CLIENT_URL}" class="btn">Continue Learning</a>
        </div>
        <div class="footer">
          © 2025 B1 Italian. All rights reserved.<br>
          <a href="${process.env.CLIENT_URL}/settings">Manage Notifications</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await this.transporter.sendMail({
    from: this.getFrom(),
    to: user.email,
    subject: `New Badge: ${badge.title} 🎉`,
    html,
  });
}












}