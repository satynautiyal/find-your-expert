import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  freshUntil: number;
  staleUntil: number;
}

export interface CacheOptions {
  /** Duration in ms for which the entry is considered completely fresh (default: 5 min) */
  ttlMs?: number;
  /** Additional window in ms during which stale data is served immediately while refreshing in background (default: 25 min) */
  swrMs?: number;
}

@Injectable()
export class MemoryCacheService {
  private readonly logger = new Logger(MemoryCacheService.name);
  private readonly store = new Map<string, CacheEntry<any>>();
  private readonly inFlight = new Map<string, Promise<any>>();

  private static readonly MAX_ENTRIES = 500;
  private static readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh
  private static readonly DEFAULT_SWR_MS = 25 * 60 * 1000; // +25 minutes stale-while-revalidate

  /**
   * Read-through cache with Single-Flight stampede protection & Stale-While-Revalidate (SWR).
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const now = Date.now();
    const ttlMs = options.ttlMs ?? MemoryCacheService.DEFAULT_TTL_MS;
    const swrMs = options.swrMs ?? MemoryCacheService.DEFAULT_SWR_MS;

    const existing = this.store.get(key);

    // 1. Fresh hit: return immediately and bump LRU order
    if (existing && now <= existing.freshUntil) {
      this.touchKey(key, existing);
      return existing.value as T;
    }

    // 2. Stale-While-Revalidate hit: return stale value in <1ms and revalidate asynchronously
    if (existing && now <= existing.staleUntil) {
      this.touchKey(key, existing);
      this.triggerBackgroundRefresh(key, factory, ttlMs, swrMs);
      return existing.value as T;
    }

    // 3. Cold miss or expired beyond SWR: coalesce concurrent callers into a single DB execution
    return this.fetchAndCache(key, factory, ttlMs, swrMs);
  }

  /**
   * Explicitly store a value in cache.
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const now = Date.now();
    const ttlMs = options.ttlMs ?? MemoryCacheService.DEFAULT_TTL_MS;
    const swrMs = options.swrMs ?? MemoryCacheService.DEFAULT_SWR_MS;

    if (this.store.size >= MemoryCacheService.MAX_ENTRIES && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      freshUntil: now + ttlMs,
      staleUntil: now + ttlMs + swrMs,
    });
  }

  /**
   * Invalidate a single cache key.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys starting with a given namespace prefix (e.g. "providers:" or "blogs:").
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache store.
   */
  clear(): void {
    this.store.clear();
  }

  private touchKey<T>(key: string, entry: CacheEntry<T>): void {
    this.store.delete(key);
    this.store.set(key, entry);
  }

  private triggerBackgroundRefresh<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number,
    swrMs: number
  ): void {
    if (this.inFlight.has(key)) return;

    this.fetchAndCache(key, factory, ttlMs, swrMs).catch((err) => {
      this.logger.warn(`Background SWR refresh failed for key "${key}": ${err?.message || err}`);
    });
  }

  private fetchAndCache<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number,
    swrMs: number
  ): Promise<T> {
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = (async () => {
      try {
        const result = await factory();
        this.set(key, result, { ttlMs, swrMs });
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }
}

