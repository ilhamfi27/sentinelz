import * as fs from 'fs';
import { AdapterKind, AuditOptions, CacheOptions, ISentinelzConfig, SqlAdapterConfig } from '../core/types';
import { AdapterInitializationError } from '../core/errors';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new AdapterInitializationError(`Missing required environment variable: ${name}`);
  }
  return value;
}

function cacheOptionsFromEnv(): CacheOptions | undefined {
  if (process.env.SENTINELZ_CACHE_ENABLED !== 'true') return undefined;

  const enabled = true;
  const ttl = process.env.SENTINELZ_CACHE_TTL ? Number(process.env.SENTINELZ_CACHE_TTL) : undefined;
  const type = (process.env.SENTINELZ_CACHE_TYPE as 'redis' | 'memory') ?? 'memory';

  if (type === 'redis') {
    return { enabled, type: 'redis', ttl, redisUrl: required('SENTINELZ_REDIS_URL') };
  }

  return { enabled, type: 'memory', ttl };
}

function auditOptionsFromEnv(): AuditOptions | undefined {
  if (process.env.SENTINELZ_AUDIT_ENABLED !== 'true') return undefined;
  return { enabled: true };
}

/** Reads `SENTINELZ_*` env vars into an `ISentinelzConfig` (see docs/idea/0-plan.md reference table). */
export function parseConfigFromEnv(modelPathOverride?: string): ISentinelzConfig {
  const adapter = (process.env.SENTINELZ_ADAPTER ?? 'sql') as AdapterKind;
  // Undefined here is fine — SentinelzFactory.create() falls back to the bundled default model.
  const modelPath = modelPathOverride ?? process.env.SENTINELZ_MODEL_PATH;
  const migrate = { auto: process.env.SENTINELZ_MIGRATE_AUTO !== 'false' };
  const cache = cacheOptionsFromEnv();
  const audit = auditOptionsFromEnv();

  if (adapter === 'sql') {
    return {
      modelPath,
      adapter: 'sql',
      adapterConfig: {
        client: (process.env.SENTINELZ_SQL_CLIENT ?? 'pg') as SqlAdapterConfig['client'],
        connection: required('SENTINELZ_DATABASE_URL'),
        tableName: process.env.SENTINELZ_SQL_TABLE_NAME,
        schema: process.env.SENTINELZ_SQL_SCHEMA || undefined,
        createSchemaIfMissing: process.env.SENTINELZ_SQL_CREATE_SCHEMA_IF_MISSING === 'true',
      },
      migrate,
      cache,
      audit,
    };
  }

  if (adapter === 'mongo') {
    return {
      modelPath,
      adapter: 'mongo',
      adapterConfig: {
        uri: required('SENTINELZ_MONGODB_URI'),
        collectionName: process.env.SENTINELZ_MONGO_COLLECTION_NAME,
      },
      migrate,
      cache,
      audit,
    };
  }

  throw new AdapterInitializationError(`Unknown SENTINELZ_ADAPTER value: "${adapter}"`);
}

/** Loads a JSON config file. YAML support is deferred (see implementation plan notes). */
export function parseConfigFromFile(configPath: string): ISentinelzConfig {
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as ISentinelzConfig;
  if (!parsed.adapter || !parsed.adapterConfig) {
    throw new AdapterInitializationError(
      `Config file at "${configPath}" is missing required fields: adapter, adapterConfig`,
    );
  }
  return parsed;
}
