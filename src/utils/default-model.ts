import * as path from 'path';

/**
 * Resolved relative to this compiled file's own location (not process.cwd()),
 * so it correctly points at dist/assets/rbac_model.conf whether this package
 * is run from source or installed inside a consumer's node_modules.
 */
export function defaultModelPath(): string {
  return path.join(__dirname, '../assets/rbac_model.conf');
}
