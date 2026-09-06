import * as path from 'path';
import { Sentinelz } from '../src/core/enforcer';
import { SqlCasbinAdapter } from '../src/adapters/sql.adapter';
import { SqlAdapterConfig } from '../src/core/types';

const modelPath = path.join(__dirname, '../src/assets/rbac_model.conf');

/**
 * Proves the single Knex-backed SQL adapter genuinely covers multiple SQL
 * dialects via config alone — no per-dialect code. Requires
 * `docker compose up -d postgres mysql` (see docker-compose.yml).
 */
describe.each<[string, SqlAdapterConfig]>([
  [
    'postgres',
    {
      client: 'pg',
      connection: {
        host: '127.0.0.1',
        port: 55432,
        user: 'sentinelz',
        password: 'sentinelz',
        database: 'sentinelz',
      },
    },
  ],
  [
    'mysql',
    {
      client: 'mysql2',
      connection: {
        host: '127.0.0.1',
        port: 53306,
        user: 'sentinelz',
        password: 'sentinelz',
        database: 'sentinelz',
      },
    },
  ],
])('SqlCasbinAdapter against %s', (_dialect, adapterConfig) => {
  it('migrates and enforces policies end-to-end', async () => {
    const adapter = new SqlCasbinAdapter({ ...adapterConfig, tableName: `casbin_rule_${_dialect}` });
    await adapter.migrate();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.clearPolicy();
    await sentinelz.addPolicy('alice', 'articles', 'write');
    await sentinelz.savePolicy();

    expect(await sentinelz.enforce('alice', 'articles', 'write')).toBe(true);
    expect(await sentinelz.enforce('bob', 'articles', 'write')).toBe(false);

    await sentinelz.close();
  });
});
