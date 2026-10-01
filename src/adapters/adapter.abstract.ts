import type { FilteredAdapter, Model } from 'casbin';
import type { PolicyFilter } from '../core/types';

/**
 * Contract every Sentinelz adapter implements. Implements Casbin's
 * FilteredAdapter interface so instances can be passed straight into `casbin.newEnforcer(model, adapter)`,
 * plus a `migrate()` lifecycle hook and `close()` for connection cleanup.
 */
export abstract class CasbinAdapter implements FilteredAdapter {
  abstract migrate(): Promise<void>;
  abstract loadPolicy(model: Model): Promise<void>;
  abstract loadFilteredPolicy(
    model: Model,
    filter: PolicyFilter,
  ): Promise<void>;
  /** True after `loadFilteredPolicy`, false again after a full `loadPolicy`. Casbin refuses `savePolicy` while true. */
  abstract isFiltered(): boolean;
  abstract savePolicy(model: Model): Promise<boolean>;
  abstract addPolicy(sec: string, ptype: string, rule: string[]): Promise<void>;
  abstract removePolicy(
    sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void>;
  abstract removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void>;
  abstract removePolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void>;
  abstract close(): Promise<void>;
}
