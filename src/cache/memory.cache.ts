import { ICache } from './cache.interface';

interface Entry {
  value: boolean;
  expiresAt?: number;
}

/** In-process fallback cache (`cache.type: 'memory'`) — no external service required. */
export class MemoryCache implements ICache {
  private readonly store = new Map<string, Entry>();

  async get(key: string): Promise<boolean | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== undefined && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: boolean, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async invalidateAll(): Promise<void> {
    this.store.clear();
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}
