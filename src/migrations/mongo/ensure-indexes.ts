import type { Connection } from 'mongoose';

export interface EnsureCasbinIndexesOptions {
  collectionName: string;
}

/**
 * Mongo is schemaless, so there's no table DDL — but we still run an
 * idempotent "ensure indexes" step through the same migrate() lifecycle hook
 * the sql adapter uses, for consistency.
 */
export async function ensureCasbinIndexes(
  connection: Connection,
  options: EnsureCasbinIndexesOptions,
): Promise<void> {
  const collection = connection.collection(options.collectionName);
  await collection.createIndex({ ptype: 1, v0: 1, v1: 1, v2: 1 }, { name: 'sentinelz_ptype_v0_v1_v2' });
}
