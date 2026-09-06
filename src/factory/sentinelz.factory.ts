import { Sentinelz } from '../core/enforcer';
import { ISentinelzConfig } from '../core/types';
import { createAdapter } from '../adapters/adapter-registry';
import { parseConfigFromEnv, parseConfigFromFile } from '../utils/config.parser';

/** The only place adapter selection happens (with adapter-registry.ts). */
export class SentinelzFactory {
  static async create(config: ISentinelzConfig): Promise<Sentinelz> {
    const adapter = createAdapter(config.adapter, config.adapterConfig);
    const autoMigrate = config.migrate?.auto ?? true;
    if (autoMigrate) {
      await adapter.migrate();
    }
    return Sentinelz.init(config.modelPath, adapter);
  }

  static async createFromEnv(modelPath?: string): Promise<Sentinelz> {
    const config = parseConfigFromEnv(modelPath);
    return SentinelzFactory.create(config);
  }

  static async createFromFile(configPath: string): Promise<Sentinelz> {
    const config = parseConfigFromFile(configPath);
    return SentinelzFactory.create(config);
  }
}
