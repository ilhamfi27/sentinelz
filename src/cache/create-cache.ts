import { CacheOptions } from '../core/types';
import { ICache } from './cache.interface';
import { MemoryCache } from './memory.cache';
import { AdapterInitializationError } from '../core/errors';

export function createCache(options: CacheOptions): ICache {
  switch (options.type) {
    case 'memory':
      return new MemoryCache();
    case 'redis': {
      // Lazy-required so consumers who use the memory cache never load "redis".
      // options.redisUrl is guaranteed present here — CacheOptions's 'redis'
      // branch requires it, so there's no runtime check to do.
      const { RedisCache } = require('./redis.cache') as typeof import('./redis.cache');
      return new RedisCache(options.redisUrl);
    }
    default: {
      const unknownType: never = options;
      throw new AdapterInitializationError(
        `Unknown cache type: "${(unknownType as CacheOptions).type}"`,
      );
    }
  }
}
