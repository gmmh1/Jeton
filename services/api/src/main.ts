import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(express.urlencoded({ extended: false }));
  const origins = (process.env.API_CORS_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  await app.listen(process.env.API_PORT || 3000);
}

bootstrap();
