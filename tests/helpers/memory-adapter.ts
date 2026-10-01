import { Helper, Model } from 'casbin';
import { CasbinAdapter } from '../../src/adapters/adapter.abstract';
import { PolicyFilter } from '../../src/core/types';

interface Rule {
  ptype: string;
  values: string[];
}

/** Minimal in-memory adapter used only to unit-test `Sentinelz` without a real DB. */
export class MemoryCasbinAdapter extends CasbinAdapter {
  private rules: Rule[] = [];
  migrateCalls = 0;
  private filtered = false;

  async migrate(): Promise<void> {
    this.migrateCalls += 1;
  }

  async loadPolicy(model: Model): Promise<void> {
    for (const rule of this.rules) {
      Helper.loadPolicyLine([rule.ptype, ...rule.values].join(', '), model);
    }
    this.filtered = false;
  }

  async loadFilteredPolicy(model: Model, filter: PolicyFilter): Promise<void> {
    const columns = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'] as const;
    for (const rule of this.rules) {
      const ptypeOk =
        !filter.ptype?.length || filter.ptype.includes(rule.ptype);
      const valuesOk = columns.every((col, i) => {
        const accepted = filter[col];
        return (
          !accepted?.length ||
          (rule.values[i] !== undefined && accepted.includes(rule.values[i]))
        );
      });
      if (ptypeOk && valuesOk) {
        Helper.loadPolicyLine([rule.ptype, ...rule.values].join(', '), model);
      }
    }
    this.filtered = true;
  }

  isFiltered(): boolean {
    return this.filtered;
  }

  async savePolicy(model: Model): Promise<boolean> {
    const rules: Rule[] = [];
    for (const sec of ['p', 'g']) {
      const astMap = model.model.get(sec);
      if (!astMap) continue;
      for (const [ptype, ast] of astMap) {
        for (const rule of ast.policy) {
          rules.push({ ptype, values: rule });
        }
      }
    }
    this.rules = rules;
    return true;
  }

  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    this.rules.push({ ptype, values: rule });
  }

  async removePolicy(
    _sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void> {
    this.rules = this.rules.filter(
      (r) =>
        !(
          r.ptype === ptype &&
          r.values.length === rule.length &&
          r.values.every((v, i) => v === rule[i])
        ),
    );
  }

  async removeFilteredPolicy(
    _sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    this.rules = this.rules.filter((r) => {
      if (r.ptype !== ptype) return true;
      const matches = fieldValues.every(
        (v, i) => v === undefined || v === '' || r.values[fieldIndex + i] === v,
      );
      return !matches;
    });
  }

  async removePolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    for (const rule of rules) {
      await this.removePolicy(sec, ptype, rule);
    }
  }

  async close(): Promise<void> {
    // no-op
  }
}
