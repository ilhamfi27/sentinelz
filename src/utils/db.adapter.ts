import { RULE_COLUMNS } from "../constants/db";
import { CasbinRuleDoc, CasbinRuleRow } from "../core/types";

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
