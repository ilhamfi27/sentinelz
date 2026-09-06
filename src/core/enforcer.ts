import { Enforcer, newEnforcer } from 'casbin';
import { CasbinAdapter } from '../adapters/adapter.abstract';
import { EnforcementError, PolicyManagementError } from './errors';
import { ISentinelz } from './enforcer.interface';

/**
 * The only class application code talks to for enforcement/policy/role ops.
 * Construction goes through `Sentinelz.init()` (used by SentinelzFactory) since
 * building the underlying Casbin enforcer is async.
 */
export class Sentinelz implements ISentinelz {
  private constructor(
    private readonly enforcer: Enforcer,
    private readonly adapter: CasbinAdapter,
  ) {}

  static async init(modelPath: string, adapter: CasbinAdapter): Promise<Sentinelz> {
    const enforcer = await newEnforcer(modelPath, adapter);
    return new Sentinelz(enforcer, adapter);
  }

  async enforce(...args: string[]): Promise<boolean> {
    try {
      return await this.enforcer.enforce(...args);
    } catch (err) {
      throw new EnforcementError((err as Error).message);
    }
  }

  async addPolicy(...args: string[]): Promise<boolean> {
    try {
      return await this.enforcer.addPolicy(...args);
    } catch (err) {
      throw new PolicyManagementError((err as Error).message);
    }
  }

  async removePolicy(...args: string[]): Promise<boolean> {
    try {
      return await this.enforcer.removePolicy(...args);
    } catch (err) {
      throw new PolicyManagementError((err as Error).message);
    }
  }

  async updatePolicy(oldPolicy: string[], newPolicy: string[]): Promise<boolean> {
    try {
      return await this.enforcer.updatePolicy(oldPolicy, newPolicy);
    } catch (err) {
      throw new PolicyManagementError((err as Error).message);
    }
  }

  async getPolicy(): Promise<string[][]> {
    return this.enforcer.getPolicy();
  }

  async getPoliciesForUser(user: string): Promise<string[][]> {
    return this.enforcer.getFilteredPolicy(0, user);
  }

  async addRole(user: string, role: string): Promise<boolean> {
    try {
      return await this.enforcer.addRoleForUser(user, role);
    } catch (err) {
      throw new PolicyManagementError((err as Error).message);
    }
  }

  async removeRole(user: string, role: string): Promise<boolean> {
    try {
      return await this.enforcer.deleteRoleForUser(user, role);
    } catch (err) {
      throw new PolicyManagementError((err as Error).message);
    }
  }

  async getRolesForUser(user: string): Promise<string[]> {
    return this.enforcer.getRolesForUser(user);
  }

  async getUsersForRole(role: string): Promise<string[]> {
    return this.enforcer.getUsersForRole(role);
  }

  async getAllRoles(): Promise<string[]> {
    return this.enforcer.getAllRoles();
  }

  async loadPolicy(): Promise<void> {
    await this.enforcer.loadPolicy();
  }

  async savePolicy(): Promise<void> {
    await this.enforcer.savePolicy();
  }

  async clearPolicy(): Promise<void> {
    this.enforcer.clearPolicy();
  }

  /** Runs the adapter's bundled migration explicitly (see `migrate.auto` config). */
  async migrate(): Promise<void> {
    await this.adapter.migrate();
  }

  async close(): Promise<void> {
    await this.adapter.close();
  }
}
