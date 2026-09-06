/**
 * Public surface of `Sentinelz`. Exists so decorators (cache, audit) can wrap
 * a `Sentinelz` instance via composition without subclassing it — `Sentinelz`
 * itself has a private constructor by design (construction is async, see
 * `Sentinelz.init`).
 */
export interface ISentinelz {
  enforce(...args: string[]): Promise<boolean>;
  addPolicy(...args: string[]): Promise<boolean>;
  removePolicy(...args: string[]): Promise<boolean>;
  updatePolicy(oldPolicy: string[], newPolicy: string[]): Promise<boolean>;
  getPolicy(): Promise<string[][]>;
  getPoliciesForUser(user: string): Promise<string[][]>;
  addRole(user: string, role: string): Promise<boolean>;
  removeRole(user: string, role: string): Promise<boolean>;
  getRolesForUser(user: string): Promise<string[]>;
  getUsersForRole(role: string): Promise<string[]>;
  getAllRoles(): Promise<string[]>;
  loadPolicy(): Promise<void>;
  savePolicy(): Promise<void>;
  clearPolicy(): Promise<void>;
  migrate(): Promise<void>;
  close(): Promise<void>;
}
