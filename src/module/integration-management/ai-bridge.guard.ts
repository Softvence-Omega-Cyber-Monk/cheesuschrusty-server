import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AIBridgeGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientSecret = request.headers['x-ai-bridge-secret'];
    const serverSecret = this.configService.get<string>('AI_BRIDGE_SECRET');

    if (!serverSecret) {
      throw new UnauthorizedException(
        'AI Bridge is not configured on the server (AI_BRIDGE_SECRET missing).',
      );
    }

    if (!clientSecret || clientSecret !== serverSecret) {
      throw new UnauthorizedException('Invalid AI Bridge Secret.');
    }

    return true;
  }
}
