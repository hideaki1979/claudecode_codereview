import type { RateLimitInfo } from '@/types/api';

/**
 * Rate limit monitoring and handling utilities
 */

interface RateLimitState {
  limit: number;
  remaining: number;
  reset: number;
  lastUpdate: number;
}

class RateLimitMonitor {
  private state: RateLimitState | null = null;

  /**
   * Update rate limit state from API response
   */
  update(rateLimit: RateLimitInfo): void {
    this.state = {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      reset: rateLimit.reset,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Get current rate limit state
   */
  getState(): RateLimitState | null {
    return this.state;
  }

  /**
   * Check if we're approaching rate limit
   * Returns true if remaining requests are below 20% of limit
   */
  isApproachingLimit(): boolean {
    if (!this.state) {
      return false;
    }

    const threshold = this.state.limit * 0.2;
    return this.state.remaining < threshold;
  }

  /**
   * Check if rate limit is exceeded
   */
  isExceeded(): boolean {
    if (!this.state) {
      return false;
    }

    return this.state.remaining === 0;
  }

  /**
   * Get time until rate limit reset (in seconds)
   */
  getTimeUntilReset(): number {
    if (!this.state) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const resetTime = this.state.reset;

    return Math.max(0, resetTime - now);
  }

  /**
   * Get formatted reset time
   */
  getFormattedResetTime(): string {
    const seconds = this.getTimeUntilReset();

    if (seconds === 0) {
      return 'now';
    }

    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }

    return `${seconds}s`;
  }

  /**
   * Calculate optimal cache TTL based on rate limit
   * Returns longer TTL when approaching rate limit
   */
  getOptimalCacheTTL(): number {
    const baseTTL = 900; // 15 minutes

    if (!this.state) {
      return baseTTL;
    }

    // If approaching limit, extend cache TTL
    if (this.isApproachingLimit()) {
      return baseTTL * 2; // 30 minutes
    }

    // If very low on requests, use maximum TTL
    if (this.state.remaining < 100) {
      return baseTTL * 4; // 60 minutes
    }

    return baseTTL;
  }

  /**
   * Get usage percentage
   */
  getUsagePercentage(): number {
    if (!this.state || this.state.limit === 0) {
      return 0;
    }

    const used = this.state.limit - this.state.remaining;
    return Math.round((used / this.state.limit) * 100);
  }

  /**
   * Clear state (for testing or reset)
   */
  clear(): void {
    this.state = null;
  }
}

// Singleton instance
export const rateLimitMonitor = new RateLimitMonitor();

// Export for testing
export { RateLimitMonitor };
