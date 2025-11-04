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
    .setDescription('Backend API for chat system with message threading support')
    .setVersion('1.0')
    .addTag('health', 'Health check endpoints')
    .addTag('messages', 'Message CRUD and reply operations')
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
