import * as path from 'path';
import { SentinelzFactory } from '../../src/factory/sentinelz.factory';
import { Sentinelz } from '../../src/core/enforcer';
import { CachedSentinelz } from '../../src/cache/cached-sentinelz';

const modelPath = path.join(__dirname, '../../src/assets/rbac_model.conf');

function baseConfig() {
  return {
    modelPath,
    adapter: 'sql' as const,
    adapterConfig: { client: 'sqlite3' as const, connection: { filename: ':memory:' } },
  };
}

describe('SentinelzFactory cache wiring', () => {
  it('returns a plain Sentinelz (no wrapping) when cache is not configured — the default/regression case', async () => {
    const sentinelz = await SentinelzFactory.create(baseConfig());
    expect(sentinelz).toBeInstanceOf(Sentinelz);
    expect(sentinelz).not.toBeInstanceOf(CachedSentinelz);

    await sentinelz.addPolicy('alice', 'articles', 'write');
    expect(await sentinelz.enforce('alice', 'articles', 'write')).toBe(true);

    await sentinelz.close();
  });

  it('returns a plain Sentinelz when cache.enabled is false', async () => {
    const sentinelz = await SentinelzFactory.create({
      ...baseConfig(),
      cache: { enabled: false, type: 'memory' },
    });
    expect(sentinelz).toBeInstanceOf(Sentinelz);
    await sentinelz.close();
  });

  it('returns a CachedSentinelz wrapping a memory cache when cache.enabled is true', async () => {
    const sentinelz = await SentinelzFactory.create({
      ...baseConfig(),
      cache: { enabled: true, type: 'memory' },
    });
    expect(sentinelz).toBeInstanceOf(CachedSentinelz);

    await sentinelz.addPolicy('alice', 'articles', 'write');
    expect(await sentinelz.enforce('alice', 'articles', 'write')).toBe(true);
    expect(await sentinelz.enforce('bob', 'articles', 'write')).toBe(false);

    await sentinelz.close();
  });
});

describe('SentinelzFactory default model path', () => {
  it('enforces correctly when modelPath is omitted (falls back to the bundled RBAC model)', async () => {
    const sentinelz = await SentinelzFactory.create({
      adapter: 'sql',
      adapterConfig: { client: 'sqlite3', connection: { filename: ':memory:' } },
    });

    await sentinelz.addPolicy('alice', 'articles', 'write');
    await sentinelz.addRole('bob', 'admin');
    await sentinelz.addPolicy('admin', 'articles', 'write');

    expect(await sentinelz.enforce('alice', 'articles', 'write')).toBe(true);
    expect(await sentinelz.enforce('bob', 'articles', 'write')).toBe(true); // via role
    expect(await sentinelz.enforce('carol', 'articles', 'write')).toBe(false);

    await sentinelz.close();
  });

  it('createFromEnv() also falls back to the bundled model when SENTINELZ_MODEL_PATH is unset', async () => {
    const originalEnv = { ...process.env };
    delete process.env.SENTINELZ_MODEL_PATH;
    process.env.SENTINELZ_ADAPTER = 'sql';
    process.env.SENTINELZ_SQL_CLIENT = 'sqlite3';
    process.env.SENTINELZ_DATABASE_URL = ':memory:';

    try {
      const sentinelz = await SentinelzFactory.createFromEnv();
      await sentinelz.addPolicy('alice', 'articles', 'write');
      expect(await sentinelz.enforce('alice', 'articles', 'write')).toBe(true);
      await sentinelz.close();
    } finally {
      process.env = originalEnv;
    }
  });
});
