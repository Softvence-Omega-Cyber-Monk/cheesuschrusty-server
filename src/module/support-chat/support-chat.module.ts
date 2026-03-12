import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { SupportChatController } from './support-chat.controller';
import { SupportChatService } from './support-chat.service';
import { PrismaService } from 'src/common/service/prisma/prisma.service';

@Module({
  imports: [MailModule],
  controllers: [SupportChatController],
  providers: [SupportChatService, PrismaService],
  exports: [SupportChatService],
})
export class SupportChatModule {}
