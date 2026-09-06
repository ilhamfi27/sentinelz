import { CachedSentinelz } from '../../src/cache/cached-sentinelz';
import { MemoryCache } from '../../src/cache/memory.cache';
import { ISentinelz } from '../../src/core/enforcer.interface';

function createInnerMock(enforceResult = true): jest.Mocked<ISentinelz> {
  return {
    enforce: jest.fn().mockResolvedValue(enforceResult),
    addPolicy: jest.fn().mockResolvedValue(true),
    removePolicy: jest.fn().mockResolvedValue(true),
    updatePolicy: jest.fn().mockResolvedValue(true),
    getPolicy: jest.fn().mockResolvedValue([]),
    getPoliciesForUser: jest.fn().mockResolvedValue([]),
    addRole: jest.fn().mockResolvedValue(true),
    removeRole: jest.fn().mockResolvedValue(true),
    getRolesForUser: jest.fn().mockResolvedValue([]),
    getUsersForRole: jest.fn().mockResolvedValue([]),
    getAllRoles: jest.fn().mockResolvedValue([]),
    loadPolicy: jest.fn().mockResolvedValue(undefined),
    savePolicy: jest.fn().mockResolvedValue(undefined),
    clearPolicy: jest.fn().mockResolvedValue(undefined),
    migrate: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

describe('CachedSentinelz', () => {
  it('caches enforce() results — a repeated call does not hit the inner instance again', async () => {
    const inner = createInnerMock(true);
    const cached = new CachedSentinelz(inner, new MemoryCache());

    expect(await cached.enforce('alice', 'articles', 'write')).toBe(true);
    expect(await cached.enforce('alice', 'articles', 'write')).toBe(true);

    expect(inner.enforce).toHaveBeenCalledTimes(1);
  });

  it('caches per distinct argument tuple', async () => {
    const inner = createInnerMock(true);
    const cached = new CachedSentinelz(inner, new MemoryCache());

    await cached.enforce('alice', 'articles', 'write');
    await cached.enforce('bob', 'articles', 'write');

    expect(inner.enforce).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cache on addPolicy', async () => {
    const inner = createInnerMock(true);
    const cached = new CachedSentinelz(inner, new MemoryCache());

    await cached.enforce('alice', 'articles', 'write');
    await cached.addPolicy('alice', 'articles', 'write');
    await cached.enforce('alice', 'articles', 'write');

    expect(inner.enforce).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cache on addRole/removeRole/removePolicy/updatePolicy/clearPolicy', async () => {
    const inner = createInnerMock(true);
    const cache = new MemoryCache();
    const invalidateSpy = jest.spyOn(cache, 'invalidateAll');
    const cached = new CachedSentinelz(inner, cache);

    await cached.removePolicy('a');
    await cached.updatePolicy(['a'], ['b']);
    await cached.addRole('alice', 'admin');
    await cached.removeRole('alice', 'admin');
    await cached.clearPolicy();

    expect(invalidateSpy).toHaveBeenCalledTimes(5);
  });

  it('does not cache getPolicy/getPoliciesForUser/getRolesForUser (pure pass-through)', async () => {
    const inner = createInnerMock(true);
    const cached = new CachedSentinelz(inner, new MemoryCache());

    await cached.getPolicy();
    await cached.getPoliciesForUser('alice');
    await cached.getRolesForUser('alice');

    expect(inner.getPolicy).toHaveBeenCalledTimes(1);
    expect(inner.getPoliciesForUser).toHaveBeenCalledTimes(1);
    expect(inner.getRolesForUser).toHaveBeenCalledTimes(1);
  });

  it('close() closes both the cache and the inner instance', async () => {
    const inner = createInnerMock(true);
    const cache = new MemoryCache();
    const cacheCloseSpy = jest.spyOn(cache, 'close');
    const cached = new CachedSentinelz(inner, cache);

    await cached.close();

    expect(cacheCloseSpy).toHaveBeenCalledTimes(1);
    expect(inner.close).toHaveBeenCalledTimes(1);
  });
});
