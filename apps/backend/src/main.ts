import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Enable graceful shutdown hooks for process termination (SIGTERM, SIGINT)
  app.enableShutdownHooks();

  // Trust reverse proxy (Railway, Vercel, Cloudflare) for accurate IP detection in rate limiting
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  expressApp.disable('x-powered-by');

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Parse HTTP-only cookies
  app.use(cookieParser());

  // Cookie-authenticated mutations must originate from the configured dashboard.
  // Telegram webhooks use a separate secret header and are intentionally exempt.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const unsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const cookieAuthenticated = Boolean(request.cookies?.access_token);
    const telegramWebhook = request.path.startsWith('/api/telegram/');
    const origin = request.get('origin');

    if (
      unsafeMethod &&
      cookieAuthenticated &&
      !telegramWebhook &&
      (!origin || !allowedOrigins.includes(origin))
    ) {
      response.status(403).json({
        success: false,
        error: {
          code: 'INVALID_ORIGIN',
          message: 'Request origin is not allowed.',
        },
      });
      return;
    }

    next();
  });

  // Student-support payloads are sensitive and must not be stored by browsers,
  // shared proxies, or CDNs. TanStack Query keeps only a short-lived per-session
  // in-memory cache in the authenticated dashboard.
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    next();
  });

  // Global REST API prefix
  app.setGlobalPrefix('api');

  // Strict request validation DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Standardized exception format
  app.useGlobalFilters(new AllExceptionsFilter());

  // Cross-Origin Resource Sharing
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const logger = app.get(Logger);
  logger.log(`Psychology Support API running on http://localhost:${port}/api`);
  logger.log(`Health check ready at http://localhost:${port}/api/health`);
}

bootstrap();
