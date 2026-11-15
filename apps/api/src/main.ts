import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global API prefix: e.g. http://localhost:4000/api/...
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const port = Number(process.env.PORT) || 4000;
  // Omit explicit host so Node binds dual-stack (IPv4 127.0.0.1/0.0.0.0 + IPv6 ::1) with zero localhost fallback delay
  const server = await app.listen(port);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  logger.log(`🚀 Prosvetted API is running on: http://127.0.0.1:${port}/api`);
  logger.log(`🩺 Health check endpoint: http://127.0.0.1:${port}/api/health`);
}

bootstrap();
