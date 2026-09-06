const DEFAULT_STORAGE_NAME = 'sentinelz_rules';
export const DEFAULT_TABLE_NAME = DEFAULT_STORAGE_NAME;
export const DEFAULT_COLLECTION_NAME = DEFAULT_STORAGE_NAME;
export const RULE_COLUMNS = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'] as const;
export type RuleColumn = (typeof RULE_COLUMNS)[number];