import { CasbinAdapter } from './adapter.abstract';
import { AdapterConfig, AdapterKind, MongoAdapterConfig, SqlAdapterConfig } from '../core/types';
import { AdapterNotFoundError } from '../core/errors';

/**
 * Single place that branches on adapter kind. Adding a new adapter means
 * adding a case here and nowhere else (per the architecture rule: no adapter
 * switch statements outside this file and the factory).
 */
export function createAdapter(kind: AdapterKind, config: AdapterConfig): CasbinAdapter {
  switch (kind) {
    case 'sql': {
      // Lazy-required so consumers who only use 'mongo' never load sql.adapter's deps.
      const { SqlCasbinAdapter } = require('./sql.adapter') as typeof import('./sql.adapter');
      return new SqlCasbinAdapter(config as SqlAdapterConfig);
    }
    case 'mongo': {
      const { MongoCasbinAdapter } = require('./mongo.adapter') as typeof import('./mongo.adapter');
      return new MongoCasbinAdapter(config as MongoAdapterConfig);
    }
    default:
      throw new AdapterNotFoundError(`Unknown adapter kind: "${kind}". Supported: "sql", "mongo".`);
  }
}
