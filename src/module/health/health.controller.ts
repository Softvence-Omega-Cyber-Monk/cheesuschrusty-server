import { Controller, Get, HttpException } from '@nestjs/common';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './prisma.health-indicator';
import { ExternalServicesHealthIndicator } from './external-services.health-indicator';
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
  @ApiOperation({
    summary: 'Check the health and availability of core system services.',
    description: `Performs checks on DB, Memory, and Storage. External services are checked non-fatally.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/health
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'System health report.',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-05-09T...',
        services: { database: { status: 'up' }, memory_heap: { status: 'up' } },
      },
    },
  })
  async check() {
    // 1. Critical Checks (Will trigger 503 if they fail)
    let coreHealth: HealthCheckResult;
    try {
      coreHealth = await this.health.check([
        () => this.prismaHealth.isHealthy('database'),
        () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // Increased memory threshold
      ]);
    } catch (e: unknown) {
      if (e instanceof HttpException) {
        coreHealth = e.getResponse() as HealthCheckResult;
      } else {
        coreHealth = {
          status: 'error',
          info: { database: { status: 'down' } },
          error: { database: { status: 'down' } },
          details: { database: { status: 'down' } },
        };
      }
    }

    // 2. Non-Critical Checks (Always returns 200, but shows status)
    const storage = (await this.disk
      .checkStorage('storage', { thresholdPercent: 0.99, path: '/' })
      .catch((e: unknown) => {
        if (e instanceof HttpException) {
          return e.getResponse();
        }
        return { status: 'down' };
      })) as HealthCheckResult;
    const stripe = await this.externalHealth.checkService('stripe', 'STRIPE');
    const cloudinary = await this.externalHealth.checkService(
      'cloudinary',
      'CLOUDINARY',
    );
    const openai = await this.externalHealth.checkService('openai', 'OPENAI');

    // 3. Clean, Non-Redundant Response
    const allServices = {
      ...coreHealth.info,
      ...coreHealth.error,
      ...storage.info,
      ...storage.error,
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
