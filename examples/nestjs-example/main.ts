import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SentinelzService } from '../../src/nestjs';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  const sentinelzService = app.get(SentinelzService);
  await sentinelzService.addPolicy('alice', 'articles', 'write');

  await app.listen(0);
  const url = await app.getUrl();

  const allowed = await fetch(`${url}/articles/1`, {
    method: 'PATCH',
    headers: { 'x-user-id': 'alice' },
  });
  console.log('alice PATCH /articles/1 ->', allowed.status);

  const denied = await fetch(`${url}/articles/1`, {
    method: 'PATCH',
    headers: { 'x-user-id': 'bob' },
  });
  console.log('bob PATCH /articles/1 ->', denied.status);

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
