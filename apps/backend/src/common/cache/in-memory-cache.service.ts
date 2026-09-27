import { Injectable } from '@nestjs/common';

interface CacheItem<T> {
  value: T;
  expiresAt: number;
  tags: Set<string>;
}

@Injectable()
export class InMemoryCacheService {
  private readonly store = new Map<string, CacheItem<unknown>>();
  private readonly tagIndex = new Map<string, Set<string>>();

  constructor() {
    // Periodic garbage collection every 60 seconds
    const interval = setInterval(() => {
      this.evictExpired();
    }, 60_000);
    if (interval.unref) {
      interval.unref();
    }
  }

  get<T>(key: string): T | undefined {
    const item = this.store.get(key);
    if (!item) {
      return undefined;
    }

    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = 60, tags: string[] = []): void {
    // If existing item had tags, remove key from old tags
    const existing = this.store.get(key);
    if (existing) {
      for (const tag of existing.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
    }

    const tagSet = new Set(tags);
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags: tagSet,
    });

    for (const tag of tags) {
      let keys = this.tagIndex.get(tag);
      if (!keys) {
        keys = new Set();
        this.tagIndex.set(tag, keys);
      }
      keys.add(key);
    }
  }

  delete(key: string): boolean {
    const item = this.store.get(key);
    if (!item) {
      return false;
    }

    for (const tag of item.tags) {
      this.tagIndex.get(tag)?.delete(key);
    }

    return this.store.delete(key);
  }

  invalidateTags(...tags: string[]): number {
    let count = 0;
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        for (const key of keys) {
          if (this.store.delete(key)) {
            count++;
          }
        }
        this.tagIndex.delete(tag);
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
    this.tagIndex.clear();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.delete(key);
      }
    }
  }
}
