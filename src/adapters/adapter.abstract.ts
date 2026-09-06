import type { Adapter as CasbinAdapterInterface, Model } from 'casbin';

/**
 * Contract every Sentinelz adapter implements. Extends Casbin's own Adapter
 * interface so instances can be passed straight into `casbin.newEnforcer(model, adapter)`,
 * plus a `migrate()` lifecycle hook and `close()` for connection cleanup.
 */
export abstract class CasbinAdapter implements CasbinAdapterInterface {
  abstract migrate(): Promise<void>;
  abstract loadPolicy(model: Model): Promise<void>;
  abstract savePolicy(model: Model): Promise<boolean>;
  abstract addPolicy(sec: string, ptype: string, rule: string[]): Promise<void>;
  abstract removePolicy(sec: string, ptype: string, rule: string[]): Promise<void>;
  abstract removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void>;
  abstract removePolicies(sec: string, ptype: string, rules: string[][]): Promise<void>;
  abstract close(): Promise<void>;
}
