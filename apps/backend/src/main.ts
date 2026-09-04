import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Parse HTTP-only cookies
  app.use(cookieParser());

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
  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: allowedOrigin,
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
