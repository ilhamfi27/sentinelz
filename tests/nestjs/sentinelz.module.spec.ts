import { Provider } from '@nestjs/common';
import { SentinelzModule, SENTINELZ_CONFIG } from '../../src/nestjs/sentinelz.module';
import { SentinelzService } from '../../src/nestjs/sentinelz.service';
import { ISentinelzConfig } from '../../src/core/types';

const config: ISentinelzConfig = {
  modelPath: 'model.conf',
  adapter: 'sql',
  adapterConfig: { client: 'sqlite3', connection: { filename: ':memory:' } },
};

describe('SentinelzModule', () => {
  it('register() returns a DynamicModule exporting SentinelzService', () => {
    const dynamicModule = SentinelzModule.register(config);

    expect(dynamicModule.module).toBe(SentinelzModule);
    expect(dynamicModule.exports).toEqual([SentinelzService]);
    expect(dynamicModule.providers).toEqual(
      expect.arrayContaining([{ provide: SENTINELZ_CONFIG, useValue: config }, SentinelzService]),
    );
  });

  it('registerAsync() wires a factory provider for the config', () => {
    const useFactory = jest.fn().mockResolvedValue(config);
    const dynamicModule = SentinelzModule.registerAsync({ useFactory, inject: [] });

    const configProvider = (dynamicModule.providers as Provider[]).find(
      (p): p is Provider & { provide: string } =>
        typeof p === 'object' && 'provide' in p && p.provide === SENTINELZ_CONFIG,
    );

    expect(configProvider).toBeDefined();
    expect((configProvider as { useFactory: unknown }).useFactory).toBe(useFactory);
    expect(dynamicModule.exports).toEqual([SentinelzService]);
  });
});
