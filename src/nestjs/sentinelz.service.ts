import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ISentinelz } from '../core/enforcer.interface';
import { SentinelzFactory } from '../factory/sentinelz.factory';
import { ISentinelzConfig } from '../core/types';
import { SENTINELZ_CONFIG } from './constants';

/** Thin delegate to a `Sentinelz` instance built via `SentinelzFactory` on module init. */
@Injectable()
export class SentinelzService implements OnModuleInit, OnModuleDestroy {
  private sentinelz!: ISentinelz;

  constructor(@Inject(SENTINELZ_CONFIG) private readonly config: ISentinelzConfig) {}

  async onModuleInit(): Promise<void> {
    this.sentinelz = await SentinelzFactory.create(this.config);
  }

  async onModuleDestroy(): Promise<void> {
    await this.sentinelz?.close();
  }

  async enforce(...args: string[]): Promise<boolean> {
    return this.sentinelz.enforce(...args);
  }

  async addPolicy(...args: string[]): Promise<boolean> {
    return this.sentinelz.addPolicy(...args);
  }

  async removePolicy(...args: string[]): Promise<boolean> {
    return this.sentinelz.removePolicy(...args);
  }

  async updatePolicy(oldPolicy: string[], newPolicy: string[]): Promise<boolean> {
    return this.sentinelz.updatePolicy(oldPolicy, newPolicy);
  }

  async getPolicy(): Promise<string[][]> {
    return this.sentinelz.getPolicy();
  }

  async getPoliciesForUser(user: string): Promise<string[][]> {
    return this.sentinelz.getPoliciesForUser(user);
  }

  async addRole(user: string, role: string): Promise<boolean> {
    return this.sentinelz.addRole(user, role);
  }

  async removeRole(user: string, role: string): Promise<boolean> {
    return this.sentinelz.removeRole(user, role);
  }

  async getRolesForUser(user: string): Promise<string[]> {
    return this.sentinelz.getRolesForUser(user);
  }

  async getUsersForRole(role: string): Promise<string[]> {
    return this.sentinelz.getUsersForRole(role);
  }

  async getAllRoles(): Promise<string[]> {
    return this.sentinelz.getAllRoles();
  }
}
