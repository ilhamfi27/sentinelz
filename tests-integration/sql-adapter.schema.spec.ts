import { Knex } from 'knex';
import { SqlCasbinAdapter } from '../src/adapters/sql.adapter';

const pgConnection = {
  host: '127.0.0.1',
  port: 55432,
  user: 'sentinelz',
  password: 'sentinelz',
  database: 'sentinelz',
};

/**
 * Proves Postgres schema/namespace isolation: two "tenants" sharing one
 * Postgres database, each with its own schema, each managed by the same
 * adapter with no cross-tenant table collisions. Requires
 * `docker compose up -d postgres`.
 */
describe('SqlCasbinAdapter schema isolation (postgres)', () => {
  it('creates sentinelz_rules under the configured schema and leaves other schemas untouched', async () => {
    const tenantA = new SqlCasbinAdapter({
      client: 'pg',
      connection: pgConnection,
      schema: 'tenant_a',
      createSchemaIfMissing: true,
    });
    const tenantB = new SqlCasbinAdapter({
      client: 'pg',
      connection: pgConnection,
      schema: 'tenant_b',
      createSchemaIfMissing: true,
    });

    await tenantA.migrate();
    await tenantB.migrate();

    await tenantA.addPolicy('p', 'p', ['alice', 'articles', 'write']);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const knexFactory = require('knex') as (config: Knex.Config) => Knex;
    const db = knexFactory({ client: 'pg', connection: pgConnection });
    try {
      const tenantARows = await db('sentinelz_rules').withSchema('tenant_a').select();
      const tenantBRows = await db('sentinelz_rules').withSchema('tenant_b').select();

      expect(tenantARows).toHaveLength(1);
      expect(tenantBRows).toHaveLength(0);
    } finally {
      await db.destroy();
      await tenantA.close();
      await tenantB.close();
    }
  });
});
