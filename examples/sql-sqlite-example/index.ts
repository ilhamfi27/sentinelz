import * as path from 'path';
import { SentinelzFactory } from '../../src';

async function main() {
  const sentinelz = await SentinelzFactory.create({
    modelPath: path.join(__dirname, '../../src/assets/rbac_model.conf'),
    adapter: 'sql',
    adapterConfig: {
      client: 'sqlite3',
      connection: { filename: path.join(__dirname, 'dev.sqlite3') },
    },
  });

  await sentinelz.addPolicy('alice', 'articles', 'write');

  console.log('alice can write articles:', await sentinelz.enforce('alice', 'articles', 'write'));
  console.log('bob can write articles:', await sentinelz.enforce('bob', 'articles', 'write'));

  await sentinelz.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
