import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CredentialSyncGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const syncSecret = request.headers['x-sync-secret'];
    const expectedSecret = this.configService.get<string>('REMOTE_SYNC_SECRET');

    if (!expectedSecret) {
      throw new UnauthorizedException(
        'REMOTE_SYNC_SECRET is not configured on the server.',
      );
    }

    if (!syncSecret || syncSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing sync secret.');
    }

    return true;
  }
}
