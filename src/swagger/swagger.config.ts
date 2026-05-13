import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Chessus API Documentation')
  .setDescription(
    'Comprehensive API documentation for the application services',
  )
  .setVersion('1.0')
  .addCookieAuth('refreshToken')
  .addTag('API')
  .addApiKey(
    {
      type: 'apiKey',
      name: 'authorization',
      in: 'header',
    },
    'auth',
  )
  .addApiKey(
    {
      type: 'apiKey',
      name: 'x-sync-secret',
      in: 'header',
      description: 'Shared secret for server-to-server synchronization',
    },
    'sync-secret',
  )
  .addSecurityRequirements({
    auth: [],
  })
  .build();
