import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService extends PrismaClient and handles database connections.
 * 
 * Why this approach:
 * - Centralized database connection management
 * - Automatic connection on module initialization
 * - Graceful shutdown on module destruction
 * - Single source of truth for Prisma operations
 * - Can be injected into any service that needs database access
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Connect to database when module initializes.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnect from database when module is destroyed.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
