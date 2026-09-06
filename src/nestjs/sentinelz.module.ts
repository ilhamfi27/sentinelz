import { DynamicModule, FactoryProvider, Module, ModuleMetadata, Provider } from '@nestjs/common';
import { ISentinelzConfig } from '../core/types';
import { SentinelzService } from './sentinelz.service';
import { SENTINELZ_CONFIG } from './constants';

export { SENTINELZ_CONFIG };

export type SentinelzModuleConfig = ISentinelzConfig;

export interface SentinelzModuleAsyncConfig {
  imports?: ModuleMetadata['imports'];
  inject?: FactoryProvider<ISentinelzConfig>['inject'];
  useFactory: (...args: unknown[]) => Promise<ISentinelzConfig> | ISentinelzConfig;
}

@Module({})
export class SentinelzModule {
  static register(config: SentinelzModuleConfig): DynamicModule {
    return {
      module: SentinelzModule,
      providers: [{ provide: SENTINELZ_CONFIG, useValue: config }, SentinelzService],
      exports: [SentinelzService],
    };
  }

  static registerAsync(options: SentinelzModuleAsyncConfig): DynamicModule {
    const configProvider: Provider = {
      provide: SENTINELZ_CONFIG,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return {
      module: SentinelzModule,
      imports: options.imports ?? [],
      providers: [configProvider, SentinelzService],
      exports: [SentinelzService],
    };
  }
}
