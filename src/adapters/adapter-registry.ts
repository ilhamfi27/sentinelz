import { CasbinAdapter } from './adapter.abstract';
import { AdapterSelection } from '../core/types';
import { AdapterNotFoundError } from '../core/errors';

/**
 * Single place that branches on adapter kind. Adding a new adapter means
 * adding a case here and nowhere else (per the architecture rule: no adapter
 * switch statements outside this file and the factory).
 *
 * Takes the discriminated `AdapterSelection` pair (not two loose params) so
 * `selection.adapterConfig` narrows to the right shape per branch — no `as`
 * casts needed.
 */
export function createAdapter(selection: AdapterSelection): CasbinAdapter {
  switch (selection.adapter) {
    case 'sql': {
      // Lazy-required so consumers who only use 'mongo' never load sql.adapter's deps.
      const { SqlCasbinAdapter } = require('./sql.adapter') as typeof import('./sql.adapter');
      return new SqlCasbinAdapter(selection.adapterConfig);
    }
    case 'mongo': {
      const { MongoCasbinAdapter } = require('./mongo.adapter') as typeof import('./mongo.adapter');
      return new MongoCasbinAdapter(selection.adapterConfig);
    }
    default: {
      const unknownAdapter: never = selection;
      throw new AdapterNotFoundError(
        `Unknown adapter kind: "${(unknownAdapter as AdapterSelection).adapter}". Supported: "sql", "mongo".`,
      );
    }
  }
}
