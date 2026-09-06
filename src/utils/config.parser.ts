import * as fs from 'fs';
import { AdapterKind, ISentinelzConfig, MongoAdapterConfig, SqlAdapterConfig } from '../core/types';
import { AdapterInitializationError } from '../core/errors';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new AdapterInitializationError(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Reads `SENTINELZ_*` env vars into an `ISentinelzConfig` (see docs/idea/0-plan.md reference table). */
export function parseConfigFromEnv(modelPathOverride?: string): ISentinelzConfig {
  const adapter = (process.env.SENTINELZ_ADAPTER ?? 'sql') as AdapterKind;
  const modelPath = modelPathOverride ?? required('SENTINELZ_MODEL_PATH');
  const migrateAuto = process.env.SENTINELZ_MIGRATE_AUTO !== 'false';

  let adapterConfig: SqlAdapterConfig | MongoAdapterConfig;
  if (adapter === 'sql') {
    adapterConfig = {
      client: (process.env.SENTINELZ_SQL_CLIENT ?? 'pg') as SqlAdapterConfig['client'],
      connection: required('SENTINELZ_DATABASE_URL'),
      tableName: process.env.SENTINELZ_SQL_TABLE_NAME,
      schema: process.env.SENTINELZ_SQL_SCHEMA || undefined,
      createSchemaIfMissing: process.env.SENTINELZ_SQL_CREATE_SCHEMA_IF_MISSING === 'true',
    };
  } else if (adapter === 'mongo') {
    adapterConfig = {
      uri: required('SENTINELZ_MONGODB_URI'),
      collectionName: process.env.SENTINELZ_MONGO_COLLECTION_NAME,
    };
  } else {
    throw new AdapterInitializationError(`Unknown SENTINELZ_ADAPTER value: "${adapter}"`);
  }

  const config: ISentinelzConfig = {
    modelPath,
    adapter,
    adapterConfig,
    migrate: { auto: migrateAuto },
  };

  if (process.env.SENTINELZ_CACHE_ENABLED === 'true') {
    config.cache = {
      enabled: true,
      type: (process.env.SENTINELZ_CACHE_TYPE as 'redis' | 'memory') ?? 'memory',
      ttl: process.env.SENTINELZ_CACHE_TTL ? Number(process.env.SENTINELZ_CACHE_TTL) : undefined,
      redisUrl: process.env.SENTINELZ_REDIS_URL,
    };
  }

  if (process.env.SENTINELZ_AUDIT_ENABLED === 'true') {
    config.audit = { enabled: true };
  }

  return config;
}

/** Loads a JSON config file. YAML support is deferred (see implementation plan notes). */
export function parseConfigFromFile(configPath: string): ISentinelzConfig {
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as ISentinelzConfig;
  if (!parsed.modelPath || !parsed.adapter || !parsed.adapterConfig) {
    throw new AdapterInitializationError(
      `Config file at "${configPath}" is missing required fields: modelPath, adapter, adapterConfig`,
    );
  }
  return parsed;
}
