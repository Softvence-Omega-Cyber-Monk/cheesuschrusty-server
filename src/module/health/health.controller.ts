import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './prisma.health-indicator';
import { ExternalServicesHealthIndicator } from './external-services.health-indicator';
import { CredentialProvider } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private externalHealth: ExternalServicesHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Industry-standard health check for server and services.' })
  async check() {
    // 1. Critical Checks (Will trigger 503 if they fail)
    let coreHealth;
    try {
      coreHealth = await this.health.check([
        () => this.prismaHealth.isHealthy('database'),
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        () => this.disk.checkStorage('storage', { thresholdPercent: 0.95, path: '/' }),
      ]);
    } catch (e) {
      coreHealth = e.getResponse();
    }

    // 2. Non-Critical Checks (Always returns 200, but shows status)
    const stripe = await this.externalHealth.checkService('stripe', 'STRIPE' as any);
    const cloudinary = await this.externalHealth.checkService('cloudinary', 'CLOUDINARY' as any);
    const openai = await this.externalHealth.checkService('openai', 'OPENAI' as any);

    // 3. Clean, Non-Redundant Response
    const allServices = {
      ...coreHealth.info,
      ...coreHealth.error,
      ...stripe,
      ...cloudinary,
      ...openai,
    };

    return {
      status: coreHealth.status === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: allServices,
    };
  }
}
