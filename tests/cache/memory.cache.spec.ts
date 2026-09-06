import { MemoryCache } from '../../src/cache/memory.cache';

describe('MemoryCache', () => {
  it('returns undefined for a missing key', async () => {
    const cache = new MemoryCache();
    expect(await cache.get('missing')).toBeUndefined();
  });

  it('stores and retrieves a value', async () => {
    const cache = new MemoryCache();
    await cache.set('alice articles write', true);
    expect(await cache.get('alice articles write')).toBe(true);
  });

  it('expires a value after its TTL', async () => {
    jest.useFakeTimers();
    const cache = new MemoryCache();
    await cache.set('k', true, 1);
    expect(await cache.get('k')).toBe(true);

    jest.advanceTimersByTime(1001);
    expect(await cache.get('k')).toBeUndefined();
    jest.useRealTimers();
  });

  it('invalidateAll clears every entry', async () => {
    const cache = new MemoryCache();
    await cache.set('a', true);
    await cache.set('b', false);
    await cache.invalidateAll();

    expect(await cache.get('a')).toBeUndefined();
    expect(await cache.get('b')).toBeUndefined();
  });
});
