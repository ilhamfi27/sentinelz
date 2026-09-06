import * as path from 'path';
import { Sentinelz } from '../../src/core/enforcer';
import { SqlCasbinAdapter } from '../../src/adapters/sql.adapter';

const modelPath = path.join(__dirname, '../../src/assets/rbac_model.conf');

function createAdapter(): SqlCasbinAdapter {
  return new SqlCasbinAdapter({ client: 'sqlite3', connection: { filename: ':memory:' } });
}

describe('SqlCasbinAdapter (sqlite, in-memory)', () => {
  it('migrates and enforces policies end-to-end', async () => {
    const adapter = createAdapter();
    await adapter.migrate();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.addPolicy('alice', 'data1', 'read');
    expect(await sentinelz.enforce('alice', 'data1', 'read')).toBe(true);
    expect(await sentinelz.enforce('alice', 'data1', 'write')).toBe(false);

    await sentinelz.close();
  });

  it('migrate() is idempotent (second run does not error)', async () => {
    const adapter = createAdapter();
    await adapter.migrate();
    await expect(adapter.migrate()).resolves.not.toThrow();
    await adapter.close();
  });

  it('persists policies via savePolicy/loadPolicy round-trip', async () => {
    const adapter = createAdapter();
    await adapter.migrate();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.addPolicy('bob', 'data2', 'write');
    await sentinelz.savePolicy();
    await sentinelz.loadPolicy();
    expect(await sentinelz.enforce('bob', 'data2', 'write')).toBe(true);

    await sentinelz.close();
  });

  it('removes policies', async () => {
    const adapter = createAdapter();
    await adapter.migrate();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.addPolicy('carol', 'data3', 'read');
    await sentinelz.removePolicy('carol', 'data3', 'read');
    expect(await sentinelz.enforce('carol', 'data3', 'read')).toBe(false);

    await sentinelz.close();
  });
});
