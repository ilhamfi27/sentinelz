import { CacheOptions } from '../core/types';
import { ICache } from './cache.interface';
import { MemoryCache } from './memory.cache';
import { AdapterInitializationError } from '../core/errors';

export function createCache(options: CacheOptions): ICache {
  if (options.type === 'memory') {
    return new MemoryCache();
  }

  if (options.type === 'redis') {
    if (!options.redisUrl) {
      throw new AdapterInitializationError('cache.redisUrl is required when cache.type is "redis"');
    }
    // Lazy-required so consumers who use the memory cache never load "redis".
    const { RedisCache } = require('./redis.cache') as typeof import('./redis.cache');
    return new RedisCache(options.redisUrl);
  }

  throw new AdapterInitializationError(`Unknown cache type: "${options.type}"`);
}
