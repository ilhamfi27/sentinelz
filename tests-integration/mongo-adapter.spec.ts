import * as path from 'path';
import { Sentinelz } from '../src/core/enforcer';
import { MongoCasbinAdapter } from '../src/adapters/mongo.adapter';

const modelPath = path.join(__dirname, '../src/assets/rbac_model.conf');

/** Requires `docker compose up -d mongo` (see docker-compose.yml). */
describe('MongoCasbinAdapter', () => {
  it('migrates (ensures indexes) and enforces policies end-to-end', async () => {
    const adapter = new MongoCasbinAdapter({
      uri: 'mongodb://127.0.0.1:57017/sentinelz_test',
      collectionName: 'casbin_rule_integration',
    });
    await adapter.migrate();
    const sentinelz = await Sentinelz.init(modelPath, adapter);

    await sentinelz.clearPolicy();
    await sentinelz.addPolicy('alice', 'articles', 'write');
    await sentinelz.savePolicy();
    await sentinelz.loadPolicy();

    expect(await sentinelz.enforce('alice', 'articles', 'write')).toBe(true);
    expect(await sentinelz.enforce('bob', 'articles', 'write')).toBe(false);

    await sentinelz.close();
  });
});
