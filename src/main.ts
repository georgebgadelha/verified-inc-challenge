import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { logger } from './logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription('Backend API for chat system with JWT authentication and message threading support')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints (register, login, refresh)')
    .addTag('users', 'User profile and account management')
    .addTag('groups', 'Group creation and management')
    .addTag('messages', 'Message CRUD and reply operations (requires authentication)')
    .addTag('health', 'Health check endpoints')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'X-API-Key')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  logger.info(`Server listening on http://localhost:${port}`);
  logger.info(`API v1 available at http://localhost:${port}/v1`);
  logger.info(`Swagger docs available at http://localhost:${port}/api`);
}

bootstrap();
