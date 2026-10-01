import { RULE_COLUMNS } from '../constants/db';
import { CasbinRuleDoc, CasbinRuleRow, PolicyFilter } from '../core/types';

function ruleFromArgs(
  row: CasbinRuleRow | CasbinRuleDoc,
  rule: string[],
): void {
  rule.forEach((value, index) => {
    if (index < RULE_COLUMNS.length) {
      row[RULE_COLUMNS[index]] = value;
    }
  });
}

export function ruleRowFromArgs(ptype: string, rule: string[]): CasbinRuleRow {
  const row: CasbinRuleRow = { ptype };
  ruleFromArgs(row, rule);
  return row;
}

export function docFromArgs(ptype: string, rule: string[]): CasbinRuleDoc {
  const doc: CasbinRuleDoc = { ptype };
  ruleFromArgs(doc, rule);
  return doc;
}

/** Columns of a `PolicyFilter` that actually constrain the query (non-empty lists only). */
export function activeFilterEntries(
  filter: PolicyFilter,
): Array<[keyof PolicyFilter, string[]]> {
  return (['ptype', ...RULE_COLUMNS] as const).flatMap((key) => {
    const values = filter[key];
    return values && values.length > 0
      ? [[key, values] as [keyof PolicyFilter, string[]]]
      : [];
  });
}

/** Turns a stored rule (row or doc) into the comma-separated line Casbin's `Helper.loadPolicyLine` expects. */
export function ruleToLine(rule: CasbinRuleRow | CasbinRuleDoc): string {
  return [rule.ptype, ...RULE_COLUMNS.map((col) => rule[col])]
    .filter((value) => value !== undefined && value !== null)
    .join(', ');
}
