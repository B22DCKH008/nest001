import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.cacheManager.set('health_ping', '1', 5);
          return { redis: { status: 'up' } };
        } catch {
          throw new Error('Redis connection failed');
        }
      },
    ]);
  }
}
