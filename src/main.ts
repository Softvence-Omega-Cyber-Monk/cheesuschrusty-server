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
    bodyParser: false,
  });

  app.enableCors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://cheesuschrustyy.netlify.app",
      "http://72.62.26.34:4173",
      "https://cheescusty.netlify.app",
      "https://prontocorso.com"
    ],
    credentials: true,
  });
  app.use('/subscriptions/webhook', bodyParser.raw({
    type: 'application/json',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.includes('/prompts/')) {
      return bodyParser.text({
        type: '*/*',
        limit: '50mb'
      })(req, res, next);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://cheesuschrustyy.netlify.app",
      "http://72.62.26.34:4173",
      "https://cheescusty.netlify.app",
      "https://prontocorso.com"
    ],
    credentials: true,
  });

  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);

  app.useGlobalGuards(
    new JwtGuard(reflector, prisma),
    new RolesGuard(reflector),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      skipUndefinedProperties: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  setupSwagger(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on port ${port}`);
}

bootstrap();