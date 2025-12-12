import type { CacheEntry } from '@/types/api';
import { CACHE_CONFIG } from '@/types/api';

/**
 * Simple in-memory cache with TTL support
 * Used for caching GitHub API responses to reduce rate limit usage
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private readonly ttl: number;
  private readonly maxEntries: number;

  constructor(ttl: number = CACHE_CONFIG.TTL, maxEntries: number = CACHE_CONFIG.MAX_ENTRIES) {
    this.cache = new Map();
    this.ttl = ttl * 1000; // Convert to milliseconds
    this.maxEntries = maxEntries;
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const now = Date.now();

    // Check if cache entry is expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache data with TTL
   */
  set<T>(key: string, data: T, customTtl?: number): void {
    const now = Date.now();
    const ttl = customTtl ? customTtl * 1000 : this.ttl;

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };

    // Implement LRU: remove oldest entry if cache is full
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Move accessed item to the end to mark as recently used
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, entry as CacheEntry<unknown>);
  }

  /**
   * Generate and return cache key for pull requests list
   */
  getListKey(params: Record<string, unknown>): string {
    return this.generateKey('pr:list', params);
  }

  /**
   * Generate and return cache key for single pull request
   */
  getPullRequestKey(owner: string, repo: string, pullNumber: number): string {
    return this.generateKey('pr:get', { owner, repo, pull_number: pullNumber });
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxEntries: number;
    ttlSeconds: number;
  } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttlSeconds: this.ttl / 1000,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Export for testing
export { MemoryCache };
