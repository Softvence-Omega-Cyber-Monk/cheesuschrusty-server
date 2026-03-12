import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { JwtGuard } from './common/guards/jwt.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaService } from './common/service/prisma/prisma.service';
import { setupSwagger } from './swagger/swagger.setup';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import * as bodyParser from 'body-parser';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser to configure custom parsers
  });

  // CORS Configuration
  const corsOptions = {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://cheesuschrustyy.netlify.app',
      'http://72.62.26.34:4173',
      'https://cheescusty.netlify.app',
      'https://prontocorso.com',
    ],
    credentials: true,
  };

  app.enableCors(corsOptions);

  // 1. Raw body parser for webhook (Stripe, etc.)
  app.use(
    '/subscriptions/webhook',
    bodyParser.raw({
      type: 'application/json',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // 2. Text/plain parser for prompt routes - PRESERVES ALL CHARACTERS EXACTLY
  app.use(
    '/prompts/master-prompt-questions',
    bodyParser.text({
      type: 'text/plain',
      limit: '50mb',
      defaultCharset: 'utf-8',
    }),
  );

  app.use(
    '/prompts/master-prompt-feedback',
    bodyParser.text({
      type: 'text/plain',
      limit: '50mb',
      defaultCharset: 'utf-8',
    }),
  );

  // 3. Default JSON parser for all other routes
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Guards
  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);

  app.useGlobalGuards(
    new JwtGuard(reflector, prisma),
    new RolesGuard(reflector),
  );

  // Validation Pipe - NOTE: skipUndefinedProperties is important
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      skipUndefinedProperties: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger Setup
  setupSwagger(app);

  // Start Server
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on port ${port}`);
}

bootstrap();
