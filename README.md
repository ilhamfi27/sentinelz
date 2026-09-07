# Sentinelz

## What is this?

`sentinelz` wraps [Apache Casbin](https://casbin.org) — the open-source library that handles RBAC/ABAC authorization logic ("who can do what") — and removes the usual database setup pain around it.

Normally, using Casbin with a database means picking a specific adapter package (a TypeORM adapter, a Prisma adapter, a Mongoose adapter, ...), installing it separately, wiring it up, and manually creating the table Casbin needs. `sentinelz` removes that: you pick `sql` or `mongo`, give it a connection string, and it:

1. Creates its own table/collection automatically — no manual `CREATE TABLE`
2. Gives you one simple class (`Sentinelz`) to check permissions and manage roles
3. Works completely independently of whatever database/ORM your app already uses for its own data — it doesn't integrate with your existing tables, it just owns one small `sentinelz_rules` table off to the side

## Install

```bash
npm install sentinelz
# plus the driver for your dialect/database:
npm install knex pg        # sql adapter, Postgres
npm install knex mysql2    # sql adapter, MySQL
npm install knex sqlite3   # sql adapter, SQLite
npm install mongoose       # mongo adapter
npm install redis          # optional: redis cache
```

Casbin itself ships as part of `sentinelz` — you never install or import it directly. The adapter/cache packages above are optional dependencies: install only what your chosen adapter/cache needs.

## How you'd actually use it

Say you're building an app where users can read/write "articles", and some users are admins. You don't write any Casbin config for this — `sentinelz` ships a sensible default (plain role-based: subject, object, action + roles) and uses it automatically. Just connect and start calling methods on the instance:

```typescript
import { SentinelzFactory } from 'sentinelz';

const sentinelz = await SentinelzFactory.create({
  adapter: 'sql',
  adapterConfig: {
    client: 'pg', // or 'mysql2', 'sqlite3'
    connection: process.env.DATABASE_URL,
  },
});
// The sentinelz_rules table is created automatically here — nothing to set up manually.

// Give alice permission to write articles
await sentinelz.addPolicy('alice', 'articles', 'write');

// Make bob an admin, and give admins permission to write articles
await sentinelz.addPolicy('admin', 'articles', 'write');
await sentinelz.addRole('bob', 'admin');

// Now check permissions anywhere in your app:
await sentinelz.enforce('alice', 'articles', 'write'); // true (direct policy)
await sentinelz.enforce('bob', 'articles', 'write');   // true (via admin role)
await sentinelz.enforce('carol', 'articles', 'write'); // false (no policy, no role)
```

**Use it in a route**, right before letting the request through:

```typescript
app.patch('/articles/:id', async (req, res) => {
  const allowed = await sentinelz.enforce(req.user.id, 'articles', 'write');
  if (!allowed) return res.status(403).send('Forbidden');
  // ...update the article
});
```

If you use NestJS, there's a guard + decorator that does this declaratively — see the [NestJS](#nestjs) section below.

That's the whole workflow: `SentinelzFactory.create()` once, add policies/roles as your app needs them (usually from an admin panel or a seed script), and call `enforce()` wherever you need a yes/no permission check. You interact with one instance and its methods — nothing about Casbin or the underlying database leaks into your code.

### Custom permission model (advanced / ABAC)

The default model covers plain RBAC. If you need attribute-based rules or a custom matcher, pass your own [Casbin model file](https://casbin.org/docs/model-storage) — this is the only case where you'd need to touch Casbin's own config format:

```typescript
const sentinelz = await SentinelzFactory.create({
  modelPath: './rbac_model.conf', // your own model — omit this field to use the bundled default
  adapter: 'sql',
  adapterConfig: { client: 'pg', connection: process.env.DATABASE_URL },
});
```

```ini
# rbac_model.conf — this is exactly what's bundled as the default, shown here as a starting point
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

## Adapters

One adapter per storage family — not per ORM:

| Adapter | Backed by | Covers |
| --- | --- | --- |
| `sql` | [Knex](https://knexjs.org) | PostgreSQL, MySQL, SQLite, MS SQL Server — pick the dialect via `client` |
| `mongo` | [Mongoose](https://mongoosejs.com) | MongoDB |

```typescript
// Postgres
{ adapter: 'sql', adapterConfig: { client: 'pg', connection: process.env.DATABASE_URL } }

// MySQL
{ adapter: 'sql', adapterConfig: { client: 'mysql2', connection: process.env.DATABASE_URL } }

// SQLite (zero-infra, great for tests)
{ adapter: 'sql', adapterConfig: { client: 'sqlite3', connection: { filename: './dev.sqlite3' } } }

// MongoDB
{ adapter: 'mongo', adapterConfig: { uri: process.env.MONGODB_URI } }
```

### Postgres/MSSQL schema (namespace) support

```typescript
{
  adapter: 'sql',
  adapterConfig: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    schema: 'tenant_a',            // isolates this consumer's rows under tenant_a.sentinelz_rules
    createSchemaIfMissing: true,   // opt-in CREATE SCHEMA IF NOT EXISTS during migrate()
  },
}
```

Ignored (with a warning) for `sqlite3`/`mysql2`, which have no schema concept.

## Migrations

Both adapters own their schema and run it automatically on `SentinelzFactory.create()` (`migrate: { auto: true }` by default). No manual `CREATE TABLE`, ever. Set `migrate: { auto: false }` and call `sentinelz.migrate()` yourself if you'd rather run migrations as an explicit deploy step.

## Config sources

```typescript
// Explicit config (shown above), or:
const sentinelz = await SentinelzFactory.createFromEnv();   // reads SENTINELZ_* env vars
const sentinelz = await SentinelzFactory.createFromFile('./sentinelz.config.json');
```

See `.env.example` for the full `SENTINELZ_*` environment variable reference.

## Optional Redis (or in-memory) caching

Caches `enforce()` results; a decorator over the core enforcer, not baked into it — fully disabled by default, and disabling it changes nothing about correctness.

```typescript
const sentinelz = await SentinelzFactory.create({
  adapter: 'sql',
  adapterConfig: { client: 'pg', connection: process.env.DATABASE_URL },
  cache: {
    enabled: true,
    type: 'redis',          // or 'memory' for an in-process fallback
    ttl: 300,
    redisUrl: process.env.REDIS_URL,
  },
});
```

Any policy or role mutation (`addPolicy`, `removePolicy`, `addRole`, ...) invalidates the whole cache — correctness over partial-invalidation cleverness.

## NestJS

```typescript
import { Module } from '@nestjs/common';
import { SentinelzModule } from 'sentinelz/nestjs';

@Module({
  imports: [
    SentinelzModule.register({
      adapter: 'sql',
      adapterConfig: { client: 'pg', connection: process.env.DATABASE_URL },
    }),
  ],
})
export class AppModule {}
```

```typescript
import { Controller, Patch, Param, UseGuards } from '@nestjs/common';
import { SentinelzGuard, CheckAbility } from 'sentinelz/nestjs';

@Controller('articles')
@UseGuards(SentinelzGuard)
export class ArticlesController {
  @Patch(':id')
  @CheckAbility({ action: 'write', resource: 'articles' })
  async updateArticle(@Param('id') id: string) {
    // Only reached if req.user.id has write permission on articles
    return { success: true, id };
  }
}
```

`sentinelz/nestjs` is a separate export path — a non-Nest consumer never pulls in `@nestjs/common`.

## API

```typescript
class Sentinelz {
  enforce(...args: string[]): Promise<boolean>;
  addPolicy(...args: string[]): Promise<boolean>;
  removePolicy(...args: string[]): Promise<boolean>;
  updatePolicy(oldPolicy: string[], newPolicy: string[]): Promise<boolean>;
  getPolicy(): Promise<string[][]>;
  getPoliciesForUser(user: string): Promise<string[][]>;
  addRole(user: string, role: string): Promise<boolean>;
  removeRole(user: string, role: string): Promise<boolean>;
  getRolesForUser(user: string): Promise<string[]>;
  getUsersForRole(role: string): Promise<string[]>;
  getAllRoles(): Promise<string[]>;
  loadPolicy(): Promise<void>;
  savePolicy(): Promise<void>;
  clearPolicy(): Promise<void>;
  migrate(): Promise<void>;
  close(): Promise<void>;
}

class SentinelzFactory {
  static create(config: ISentinelzConfig): Promise<ISentinelz>;
  static createFromEnv(modelPath?: string): Promise<ISentinelz>;
  static createFromFile(configPath: string): Promise<ISentinelz>;
}
```

Errors thrown are typed: `AdapterNotFoundError`, `AdapterInitializationError`, `MigrationError`, `EnforcementError`, `PolicyManagementError` — all extend `SentinelzError`.

## Examples

Runnable examples live under [`examples/`](./examples): `sql-sqlite-example`, `sql-postgres-example`, `mongo-example`, `nestjs-example`.

## Development

```bash
yarn install
yarn build
yarn test              # unit tests (mocked/SQLite, no external services)
docker compose up -d   # postgres, mysql, mongo, redis
yarn test:integration
```

Releases are fully automated — see [`docs/RELEASING.md`](./docs/RELEASING.md).

## License

MIT
