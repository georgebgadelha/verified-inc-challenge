import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from './logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  logger.info(`Server listening on http://localhost:${port}`);
}

bootstrap();
