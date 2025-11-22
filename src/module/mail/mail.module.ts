import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailTemplatesService } from './mail.template';

@Global()
@Module({
  controllers: [MailController],
  providers: [MailService,MailTemplatesService],
  exports:[MailService,MailTemplatesService]
})
export class MailModule {}
