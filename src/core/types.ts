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

export interface MigrateOptions {
  auto?: boolean;
}

export interface CacheOptions {
  enabled: boolean;
  type: 'redis' | 'memory';
  ttl?: number;
  redisUrl?: string;
}

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

export interface ISentinelzConfig {
  modelPath: string;
  adapter: AdapterKind;
  adapterConfig: AdapterConfig;
  migrate?: MigrateOptions;
  cache?: CacheOptions;
  audit?: AuditOptions;
  multiTenant?: MultiTenantOptions;
}

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

