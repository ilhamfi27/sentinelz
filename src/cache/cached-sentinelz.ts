import { ISentinelz } from '../core/enforcer.interface';
import { cacheKey } from '../utils/cache.adapter';
import { ICache } from './cache.interface';

/**
 * Wraps a `Sentinelz` instance to cache `enforce()` results. A decorator, not
 * core logic (see CLAUDE.md) — `Sentinelz` itself is untouched and behaves
 * identically whether or not this wrapper is used.
 *
 * Any policy/role mutation invalidates the whole cache rather than attempting
 * partial invalidation: a single role change can affect an unbounded number
 * of cached (sub, obj, act) results, so correctness wins over cache hit rate.
 */
export class CachedSentinelz implements ISentinelz {
  constructor(
    private readonly inner: ISentinelz,
    private readonly cache: ICache,
    private readonly ttlSeconds?: number,
  ) {}

  async enforce(...args: string[]): Promise<boolean> {
    const key = cacheKey(args);
    const cached = await this.cache.get(key);
    if (cached !== undefined) return cached;

    const result = await this.inner.enforce(...args);
    await this.cache.set(key, result, this.ttlSeconds);
    return result;
  }

  async addPolicy(...args: string[]): Promise<boolean> {
    const result = await this.inner.addPolicy(...args);
    await this.cache.invalidateAll();
    return result;
  }

  async removePolicy(...args: string[]): Promise<boolean> {
    const result = await this.inner.removePolicy(...args);
    await this.cache.invalidateAll();
    return result;
  }

  async updatePolicy(oldPolicy: string[], newPolicy: string[]): Promise<boolean> {
    const result = await this.inner.updatePolicy(oldPolicy, newPolicy);
    await this.cache.invalidateAll();
    return result;
  }

  async getPolicy(): Promise<string[][]> {
    return this.inner.getPolicy();
  }

  async getPoliciesForUser(user: string): Promise<string[][]> {
    return this.inner.getPoliciesForUser(user);
  }

  async addRole(user: string, role: string): Promise<boolean> {
    const result = await this.inner.addRole(user, role);
    await this.cache.invalidateAll();
    return result;
  }

  async removeRole(user: string, role: string): Promise<boolean> {
    const result = await this.inner.removeRole(user, role);
    await this.cache.invalidateAll();
    return result;
  }

  async getRolesForUser(user: string): Promise<string[]> {
    return this.inner.getRolesForUser(user);
  }

  async getUsersForRole(role: string): Promise<string[]> {
    return this.inner.getUsersForRole(role);
  }

  async getAllRoles(): Promise<string[]> {
    return this.inner.getAllRoles();
  }

  async loadPolicy(): Promise<void> {
    await this.inner.loadPolicy();
    await this.cache.invalidateAll();
  }

  async savePolicy(): Promise<void> {
    await this.inner.savePolicy();
  }

  async clearPolicy(): Promise<void> {
    await this.inner.clearPolicy();
    await this.cache.invalidateAll();
  }

  async migrate(): Promise<void> {
    await this.inner.migrate();
  }

  async close(): Promise<void> {
    await this.cache.close();
    await this.inner.close();
  }
}
