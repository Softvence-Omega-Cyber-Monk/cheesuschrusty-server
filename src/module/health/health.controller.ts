import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorators';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health() {
    return {
      status: 'ok',
      version: process.env.APP_VERSION,
      timestamp: new Date().toISOString(),
    };
  }
}
