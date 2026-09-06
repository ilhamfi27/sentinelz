import type { Knex } from 'knex';

export interface EnsureCasbinRuleTableOptions {
  tableName: string;
  schema?: string;
  createSchemaIfMissing?: boolean;
  client: 'pg' | 'mysql2' | 'sqlite3' | 'mssql';
}

/**
 * Idempotently ensures the sentinelz_rules table (and its schema, if configured)
 * exists. Bundled inside the package so consumers never hand-write this DDL —
 * `SqlCasbinAdapter.migrate()` is the only caller.
 */
export async function ensureCasbinRuleTable(
  knex: Knex,
  options: EnsureCasbinRuleTableOptions,
): Promise<void> {
  const { tableName, schema, createSchemaIfMissing, client } = options;

  if (schema && createSchemaIfMissing) {
    if (client === 'mssql') {
      await knex.raw(
        `IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = ?) EXEC('CREATE SCHEMA ' + QUOTENAME(?))`,
        [schema, schema],
      );
    } else {
      await knex.raw('CREATE SCHEMA IF NOT EXISTS ??', [schema]);
    }
  }

  const builder = schema ? knex.schema.withSchema(schema) : knex.schema;
  const exists = await builder.hasTable(tableName);
  if (exists) {
    return;
  }

  await builder.createTable(tableName, (table) => {
    table.increments('id').primary();
    table.string('ptype', 255);
    table.string('v0', 255);
    table.string('v1', 255);
    table.string('v2', 255);
    table.string('v3', 255);
    table.string('v4', 255);
    table.string('v5', 255);
  });
}
