import { parse, stringify } from 'flatted';
import { CacheInterface } from './interfaces';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export class InMemoryCache<T> implements CacheInterface<T>, OnModuleInit, OnModuleDestroy {
  private cache: Map<string, { value: string; expiresAt: number }>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cache = new Map();
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.expiresAt < now) {
      this.cache.delete(key);
      return null;
    }

    return parse(entry.value);
  }

  async set(key: string, value: T, ttl: number): Promise<void> {
    const now = Date.now();
    let expiresAt: number;
    if (ttl > 0) {
      expiresAt = now + ttl * 1000;
    } else if (ttl < 0) {
      expiresAt = Number.NEGATIVE_INFINITY;
    } else {
      expiresAt = Number.POSITIVE_INFINITY;
    }

    this.cache.set(key, { value: stringify(value), expiresAt });
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(key);
  }

  onModuleInit(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (entry.expiresAt < now) {
            this.cache.delete(key);
          }
        }
      }, 60000); // 60,000 milliseconds = 1 minute
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
