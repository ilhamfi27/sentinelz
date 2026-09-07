import { Sentinelz } from '../core/enforcer';
import { ISentinelz } from '../core/enforcer.interface';
import { ISentinelzConfig } from '../core/types';
import { createAdapter } from '../adapters/adapter-registry';
import { parseConfigFromEnv, parseConfigFromFile } from '../utils/config.parser';
import { createCache } from '../cache/create-cache';
import { CachedSentinelz } from '../cache/cached-sentinelz';
import { defaultModelPath } from '../utils/default-model';

/** The only place adapter selection happens (with adapter-registry.ts). */
export class SentinelzFactory {
  static async create(config: ISentinelzConfig): Promise<ISentinelz> {
    const adapter = createAdapter(config.adapter, config.adapterConfig);
    const autoMigrate = config.migrate?.auto ?? true;
    if (autoMigrate) {
      await adapter.migrate();
    }
    const modelPath = config.modelPath ?? defaultModelPath();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    if (config.cache?.enabled) {
      const cache = createCache(config.cache);
      return new CachedSentinelz(sentinelz, cache, config.cache.ttl);
    }

    return sentinelz;
  }

  static async createFromEnv(modelPath?: string): Promise<ISentinelz> {
    const config = parseConfigFromEnv(modelPath);
    return SentinelzFactory.create(config);
  }

  static async createFromFile(configPath: string): Promise<ISentinelz> {
    const config = parseConfigFromFile(configPath);
    return SentinelzFactory.create(config);
  }
}
