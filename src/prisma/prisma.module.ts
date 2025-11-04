import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule provides database access throughout the application.
 * 
 * Why @Global:
 * - Makes PrismaService available in all modules without explicit imports
 * - Follows NestJS best practice for shared services like database connections
 * - Reduces boilerplate - no need to import PrismaModule in every feature module
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
