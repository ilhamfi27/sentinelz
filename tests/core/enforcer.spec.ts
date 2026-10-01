import * as path from 'path';
import { Sentinelz } from '../../src/core/enforcer';
import { PolicyManagementError } from '../../src/core/errors';
import { MemoryCasbinAdapter } from '../helpers/memory-adapter';

const modelPath = path.join(__dirname, '../../src/assets/rbac_model.conf');

describe('Sentinelz', () => {
  it('enforces policies added at runtime', async () => {
    const adapter = new MemoryCasbinAdapter();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.addPolicy('alice', 'data1', 'read');
    expect(await sentinelz.enforce('alice', 'data1', 'read')).toBe(true);
    expect(await sentinelz.enforce('alice', 'data1', 'write')).toBe(false);

    await sentinelz.close();
  });

  it('removes policies', async () => {
    const adapter = new MemoryCasbinAdapter();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.addPolicy('alice', 'data1', 'read');
    await sentinelz.removePolicy('alice', 'data1', 'read');
    expect(await sentinelz.enforce('alice', 'data1', 'read')).toBe(false);

    await sentinelz.close();
  });

  it('manages roles', async () => {
    const adapter = new MemoryCasbinAdapter();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.addPolicy('admin', 'data1', 'write');
    await sentinelz.addRole('bob', 'admin');

    expect(await sentinelz.enforce('bob', 'data1', 'write')).toBe(true);
    expect(await sentinelz.getRolesForUser('bob')).toEqual(['admin']);
    expect(await sentinelz.getUsersForRole('admin')).toEqual(['bob']);

    await sentinelz.removeRole('bob', 'admin');
    expect(await sentinelz.enforce('bob', 'data1', 'write')).toBe(false);

    await sentinelz.close();
  });

  it('lists all policies and all roles', async () => {
    const adapter = new MemoryCasbinAdapter();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.addPolicy('alice', 'data1', 'read');
    await sentinelz.addPolicy('bob', 'data2', 'write');
    await sentinelz.addRole('alice', 'admin');

    expect(await sentinelz.getPolicy()).toEqual(
      expect.arrayContaining([
        ['alice', 'data1', 'read'],
        ['bob', 'data2', 'write'],
      ]),
    );
    expect(await sentinelz.getPoliciesForUser('alice')).toEqual([
      ['alice', 'data1', 'read'],
    ]);
    expect(await sentinelz.getAllRoles()).toEqual(['admin']);

    await sentinelz.close();
  });

  it('clearPolicy empties the in-memory model', async () => {
    const adapter = new MemoryCasbinAdapter();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.addPolicy('alice', 'data1', 'read');
    await sentinelz.clearPolicy();
    expect(await sentinelz.getPolicy()).toEqual([]);

    await sentinelz.close();
  });

  it('delegates migrate() to the adapter', async () => {
    const adapter = new MemoryCasbinAdapter();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.migrate();
    expect(adapter.migrateCalls).toBe(1);

    await sentinelz.close();
  });

  describe('loadFilteredPolicy', () => {
    async function seeded() {
      const adapter = new MemoryCasbinAdapter();
      const sentinelz = await Sentinelz.init(modelPath, adapter);
      await sentinelz.addPolicy('alice', 'data1', 'read');
      await sentinelz.addPolicy('bob', 'data2', 'write');
      await sentinelz.addPolicy('admin', 'data3', 'write');
      await sentinelz.addRole('alice', 'admin');
      return sentinelz;
    }

    it('loads only matching rules and reports isFiltered()', async () => {
      const sentinelz = await seeded();
      expect(sentinelz.isFiltered()).toBe(false);

      await sentinelz.loadFilteredPolicy({ ptype: ['p'], v0: ['bob'] });

      expect(sentinelz.isFiltered()).toBe(true);
      expect(await sentinelz.getPolicy()).toEqual([['bob', 'data2', 'write']]);
      expect(await sentinelz.enforce('bob', 'data2', 'write')).toBe(true);
      expect(await sentinelz.enforce('alice', 'data1', 'read')).toBe(false);

      await sentinelz.close();
    });

    it('keeps role inheritance only when the g rows are included', async () => {
      const sentinelz = await seeded();

      await sentinelz.loadFilteredPolicy({
        ptype: ['p'],
        v0: ['alice', 'admin'],
      });
      expect(await sentinelz.enforce('alice', 'data3', 'write')).toBe(false);

      await sentinelz.loadFilteredPolicy({
        ptype: ['p', 'g'],
        v0: ['alice', 'admin'],
      });
      expect(await sentinelz.enforce('alice', 'data3', 'write')).toBe(true);

      await sentinelz.close();
    });

    it('treats an empty filter as no constraint', async () => {
      const sentinelz = await seeded();
      await sentinelz.loadFilteredPolicy({});
      expect(await sentinelz.getPolicy()).toHaveLength(3);
      await sentinelz.close();
    });

    it('refuses savePolicy() while filtered, and loadPolicy() restores the full set', async () => {
      const sentinelz = await seeded();
      await sentinelz.loadFilteredPolicy({ v0: ['bob'] });

      await expect(sentinelz.savePolicy()).rejects.toBeInstanceOf(
        PolicyManagementError,
      );

      await sentinelz.loadPolicy();
      expect(sentinelz.isFiltered()).toBe(false);
      expect(await sentinelz.getPolicy()).toHaveLength(3);
      await expect(sentinelz.savePolicy()).resolves.toBeUndefined();

      await sentinelz.close();
    });
  });
});
