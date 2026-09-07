export type AdapterKind = 'sql' | 'mongo';

export interface SqlAdapterConfig {
  client: 'pg' | 'mysql2' | 'sqlite3' | 'mssql';
  connection: string | Record<string, unknown>;
  tableName?: string;
  schema?: string;
  createSchemaIfMissing?: boolean;
}

export interface MongoAdapterConfig {
  uri: string;
  collectionName?: string;
}

export type AdapterConfig = SqlAdapterConfig | MongoAdapterConfig;

/**
 * Discriminated on `adapter` — shared by `ISentinelzConfig` and
 * `adapter-registry.ts`'s `createAdapter()` so there's exactly one place
 * this pairing is defined.
 */
export type AdapterSelection =
  | { adapter: 'sql'; adapterConfig: SqlAdapterConfig }
  | { adapter: 'mongo'; adapterConfig: MongoAdapterConfig };

export interface MigrateOptions {
  auto?: boolean;
}

/**
 * Discriminated on `type` — `redisUrl` is only meaningful (and required)
 * when `type: 'redis'`; the 'memory' branch doesn't carry it at all.
 */
export type CacheOptions =
  | { enabled: boolean; type: 'memory'; ttl?: number }
  | { enabled: boolean; type: 'redis'; ttl?: number; redisUrl: string };

export interface AuditEvent {
  type: 'policy' | 'role';
  action: 'add' | 'remove' | 'update';
  args: string[];
  timestamp: Date;
}

export interface AuditOptions {
  enabled: boolean;
  onPolicyChange?: (event: AuditEvent) => Promise<void>;
}

export interface MultiTenantOptions {
  enabled: boolean;
  getTenant?: (context: unknown) => string;
}

interface BaseSentinelzConfig {
  /**
   * Path to a Casbin model file. Optional — defaults to the bundled plain
   * RBAC model (sub, obj, act + roles), which covers the common case with
   * zero configuration. Only provide your own for ABAC/custom matchers.
   */
  modelPath?: string;
  migrate?: MigrateOptions;
  cache?: CacheOptions;
  audit?: AuditOptions;
  multiTenant?: MultiTenantOptions;
}

/**
 * Discriminated on `adapter` (via `AdapterSelection`) so `adapterConfig`
 * narrows automatically: `{ adapter: 'sql', adapterConfig: {...} }` only
 * offers SqlAdapterConfig's fields (no `uri`/`collectionName`), and vice
 * versa for `'mongo'`.
 */
export type ISentinelzConfig = BaseSentinelzConfig & AdapterSelection;

type CasbinRule = {
  ptype: string;
  v0?: string;
  v1?: string;
  v2?: string;
  v3?: string;
  v4?: string;
  v5?: string;
};

export type CasbinRuleDoc = CasbinRule & {
  // MongoDB document ID
  _id?: string;
}

export type CasbinRuleRow = CasbinRule & {
  id?: number;
};

