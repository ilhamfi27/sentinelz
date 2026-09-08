/**
 * Public surface of `Sentinelz`. Exists so decorators (cache, audit) can wrap
 * a `Sentinelz` instance via composition without subclassing it — `Sentinelz`
 * itself has a private constructor by design (construction is async, see
 * `Sentinelz.init`).
 *
 * A note on the `...args: string[]` methods below: their shape depends on
 * the Casbin model in use (see `ISentinelzConfig.modelPath`). With the
 * bundled default model (plain RBAC), every one of them is a
 * `(subject, object, action)` triple — e.g. `('alice', 'articles', 'write')`
 * means "user alice, resource articles, action write". If you supply your
 * own model file for ABAC/custom matchers, the number and meaning of the
 * arguments follows whatever `[request_definition]`/`[policy_definition]`
 * you defined there instead.
 */
export interface ISentinelz {
  /**
   * The core permission check: "is this request allowed?"
   *
   * @example
   * await sentinelz.enforce('alice', 'articles', 'write'); // true or false
   */
  enforce(...args: string[]): Promise<boolean>;

  /**
   * Grants a permission directly to a subject (not via a role).
   *
   * @example
   * await sentinelz.addPolicy('alice', 'articles', 'write');
   */
  addPolicy(...args: string[]): Promise<boolean>;

  /** Revokes a permission previously granted with `addPolicy` (same args shape). */
  removePolicy(...args: string[]): Promise<boolean>;

  /**
   * Atomically swaps one policy rule for another — e.g. changing what
   * action a rule covers without a separate remove-then-add.
   *
   * @param oldPolicy the existing rule, as a `[subject, object, action]`-shaped tuple
   * @param newPolicy its replacement, same shape
   */
  updatePolicy(oldPolicy: string[], newPolicy: string[]): Promise<boolean>;

  /** Every policy rule currently loaded, each as a `[subject, object, action]`-shaped tuple. */
  getPolicy(): Promise<string[][]>;

  /** Policy rules that apply directly to one subject (not counting rules inherited via a role). */
  getPoliciesForUser(user: string): Promise<string[][]>;

  /**
   * Assigns a role to a subject. A role is not itself a permission — grant
   * permissions to the role name via `addPolicy(role, obj, act)`, and every
   * subject with that role inherits them.
   *
   * @example
   * await sentinelz.addPolicy('admin', 'articles', 'write'); // the role gets the permission
   * await sentinelz.addRole('bob', 'admin');                 // bob inherits it
   */
  addRole(user: string, role: string): Promise<boolean>;

  /** Removes a role assignment from a subject (the role's own policies are untouched). */
  removeRole(user: string, role: string): Promise<boolean>;

  /** Every role name assigned to a subject. */
  getRolesForUser(user: string): Promise<string[]>;

  /** Every subject assigned to a role. */
  getUsersForRole(role: string): Promise<string[]>;

  /** Every role name that appears anywhere in the current policies. */
  getAllRoles(): Promise<string[]>;

  /** Reloads policies from the adapter's storage into memory, discarding any unsaved in-memory changes. */
  loadPolicy(): Promise<void>;

  /** Persists the current in-memory policies to the adapter's storage. */
  savePolicy(): Promise<void>;

  /** Empties the in-memory policy set. Does not touch the adapter's storage — call `savePolicy()` after if you want that persisted too. */
  clearPolicy(): Promise<void>;

  /** Runs the adapter's bundled schema/migration setup explicitly (see `migrate.auto` config). */
  migrate(): Promise<void>;

  /** Closes the underlying database connection. Call this when you're done with the instance. */
  close(): Promise<void>;
}
