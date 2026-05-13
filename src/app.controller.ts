import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorators';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @Redirect('/docs', 308)
  @ApiExcludeEndpoint()
  getHello() {
    return { url: '/docs' };
  }

  @Public()
  @Get('favicon.ico')
  @ApiExcludeEndpoint()
  getFavicon() {
    return;
  }
}
