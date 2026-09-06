import * as path from 'path';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SentinelzModule } from '../../src/nestjs';
import { ArticlesController } from './articles.controller';
import { FakeAuthMiddleware } from './auth.middleware';

@Module({
  imports: [
    SentinelzModule.register({
      modelPath: path.join(__dirname, '../../src/assets/rbac_model.conf'),
      adapter: 'sql',
      adapterConfig: { client: 'sqlite3', connection: { filename: ':memory:' } },
    }),
  ],
  controllers: [ArticlesController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(FakeAuthMiddleware).forRoutes('*');
  }
}
