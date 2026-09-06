export interface ICache {
  get(key: string): Promise<boolean | undefined>;
  set(key: string, value: boolean, ttlSeconds?: number): Promise<void>;
  invalidateAll(): Promise<void>;
  close(): Promise<void>;
}
