import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';

/**
 * Cache service wrapper providing type-safe Redis operations.
 * Handles group membership validation caching with automatic invalidation.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional, uses default if not provided)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl ? ttl * 1000 : undefined);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * Note: This requires iterating through keys, use sparingly
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // This is a simple implementation - in production, consider using Redis SCAN
      this.logger.warn(`Pattern deletion requested for: ${pattern}`);
      // Since cache-manager doesn't support pattern deletion directly,
      // you'll need to track keys or use Redis client directly for this
      // For now, we'll just log it
    } catch (error) {
      this.logger.error(`Cache DEL pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async reset(): Promise<void> {
    try {
      // Note: cache-manager's reset() might not be available in all stores
      // For Redis, you might need to use the store directly
      this.logger.warn('Cache reset requested - this may not be fully supported');
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
    }
  }

  // ========== Group Membership Caching ==========

  /**
   * Get cached group membership status
   * @returns true/false if cached, undefined if not in cache
   */
  async getGroupMembership(userId: string, groupId: string): Promise<boolean | undefined> {
    const key = this.getGroupMemberKey(userId, groupId);
    return this.get<boolean>(key);
  }

  /**
   * Cache group membership status
   * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
   */
  async setGroupMembership(
    userId: string,
    groupId: string,
    isMember: boolean,
    ttl = 300,
  ): Promise<void> {
    const key = this.getGroupMemberKey(userId, groupId);
    await this.set(key, isMember, ttl);
  }

  /**
   * Invalidate specific user's membership in a group
   */
  async invalidateGroupMembership(userId: string, groupId: string): Promise<void> {
    const key = this.getGroupMemberKey(userId, groupId);
    await this.del(key);
  }

  /**
   * Invalidate all memberships for a specific group
   * Call this when group members change
   */
  async invalidateGroupMemberships(groupId: string, userIds: string[]): Promise<void> {
    // Invalidate cache for all affected users
    const promises = userIds.map((userId) => this.invalidateGroupMembership(userId, groupId));
    await Promise.all(promises);
    this.logger.log(`Invalidated ${userIds.length} memberships for group ${groupId}`);
  }

  /**
   * Generate cache key for group membership
   */
  private getGroupMemberKey(userId: string, groupId: string): string {
    return `group:${groupId}:member:${userId}`;
  }
}
