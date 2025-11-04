import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

/**
 * Health check controller for monitoring API availability.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Returns comprehensive health status including database, memory, and uptime.
   * @returns Health status object
   */
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Check API health including database connection, memory usage, and uptime' })
  @ApiResponse({ 
    status: 200, 
    description: 'API health status',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-11-04T10:30:00.000Z',
        uptime: '3600s',
        database: { status: 'up' },
        memory: { heapUsed: '45MB', heapTotal: '60MB', rss: '120MB' }
      }
    }
  })
  async get() {
    return this.healthService.getHealthStatus();
  }
}
