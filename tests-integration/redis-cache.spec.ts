import * as path from 'path';
import { RedisCache } from '../src/cache/redis.cache';
import { CachedSentinelz } from '../src/cache/cached-sentinelz';
import { Sentinelz } from '../src/core/enforcer';
import { SqlCasbinAdapter } from '../src/adapters/sql.adapter';

const REDIS_URL = 'redis://127.0.0.1:56379';
const modelPath = path.join(__dirname, '../src/assets/rbac_model.conf');

/** Requires `docker compose up -d redis` (see docker-compose.yml). */
describe('RedisCache', () => {
  it('stores, retrieves, and invalidates values against a real Redis instance', async () => {
    const cache = new RedisCache(REDIS_URL);
    try {
      expect(await cache.get('missing-key')).toBeUndefined();

      await cache.set('alice articles write', true);
      expect(await cache.get('alice articles write')).toBe(true);

      await cache.set('bob articles write', false, 60);
      expect(await cache.get('bob articles write')).toBe(false);

      await cache.invalidateAll();
      expect(await cache.get('alice articles write')).toBeUndefined();
      expect(await cache.get('bob articles write')).toBeUndefined();
    } finally {
      await cache.close();
    }
  });
});

describe('CachedSentinelz with a real Redis cache', () => {
  it('caches enforce() through Redis and invalidates on policy changes', async () => {
    const adapter = new SqlCasbinAdapter({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      tableName: 'sentinelz_rules_redis_it',
    });
    await adapter.migrate();
    const sentinelz = await Sentinelz.init(modelPath, adapter);
    const cache = new RedisCache(REDIS_URL);
    await cache.invalidateAll();
    const cached = new CachedSentinelz(sentinelz, cache);

    await cached.addPolicy('alice', 'articles', 'write');
    expect(await cached.enforce('alice', 'articles', 'write')).toBe(true);
    expect(await cached.enforce('bob', 'articles', 'write')).toBe(false);

    // Cached now: directly poison the underlying enforcer's answer path by
    // removing the policy without going through the cached wrapper's
    // invalidation, to prove the *cache* (not just the enforcer) is serving
    // the read.
    await sentinelz.removePolicy('alice', 'articles', 'write');
    expect(await cached.enforce('alice', 'articles', 'write')).toBe(true); // stale cache hit

    // Now invalidate properly and confirm the fresh (correct) answer.
    await cache.invalidateAll();
    expect(await cached.enforce('alice', 'articles', 'write')).toBe(false);

    await cached.close();
  });
});
