import type { RedisClientType } from 'redis';
import { ICache } from './cache.interface';
import { AdapterInitializationError } from '../core/errors';

const KEY_PREFIX = 'sentinelz:enforce:';

export class RedisCache implements ICache {
  private readonly client: RedisClientType;
  private readonly ready: Promise<void>;

  constructor(redisUrl: string) {
    let createClient: (options: { url: string }) => RedisClientType;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ({ createClient } = require('redis'));
    } catch {
      throw new AdapterInitializationError(
        'The "redis" package is required for redis cache. Install it with `npm install redis`.',
      );
    }

    this.client = createClient({ url: redisUrl });
    this.ready = this.client.connect().then(() => undefined);
  }

  async get(key: string): Promise<boolean | undefined> {
    await this.ready;
    const value = await this.client.get(KEY_PREFIX + key);
    if (value === null) return undefined;
    return value === '1';
  }

  async set(key: string, value: boolean, ttlSeconds?: number): Promise<void> {
    await this.ready;
    const redisKey = KEY_PREFIX + key;
    const redisValue = value ? '1' : '0';
    if (ttlSeconds !== undefined) {
      await this.client.set(redisKey, redisValue, { EX: ttlSeconds });
    } else {
      await this.client.set(redisKey, redisValue);
    }
  }

  /** Scans and deletes only this cache's own keys — never FLUSHALL/FLUSHDB on a shared Redis instance. */
  async invalidateAll(): Promise<void> {
    await this.ready;
    let cursor = 0;
    do {
      const result = await this.client.scan(cursor, { MATCH: `${KEY_PREFIX}*`, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) {
        await this.client.del(result.keys);
      }
    } while (cursor !== 0);
  }

  async close(): Promise<void> {
    await this.ready;
    await this.client.quit();
  }
}
