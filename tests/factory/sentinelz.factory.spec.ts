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
