import * as path from 'path';
import { SentinelzService } from '../../src/nestjs/sentinelz.service';

describe('SentinelzService', () => {
  it('initializes on onModuleInit and delegates enforce/policy calls', async () => {
    const service = new SentinelzService({
      modelPath: path.join(__dirname, '../../src/assets/rbac_model.conf'),
      adapter: 'sql',
      adapterConfig: { client: 'sqlite3', connection: { filename: ':memory:' } },
    });

    await service.onModuleInit();

    await service.addPolicy('alice', 'articles', 'write');
    expect(await service.enforce('alice', 'articles', 'write')).toBe(true);
    expect(await service.enforce('bob', 'articles', 'write')).toBe(false);

    await service.addRole('alice', 'editor');
    expect(await service.getRolesForUser('alice')).toEqual(['editor']);

    await service.onModuleDestroy();
  });
});
