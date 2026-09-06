export class SentinelzError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AdapterNotFoundError extends SentinelzError {}
export class AdapterInitializationError extends SentinelzError {}
export class MigrationError extends SentinelzError {}
export class EnforcementError extends SentinelzError {}
export class PolicyManagementError extends SentinelzError {}
