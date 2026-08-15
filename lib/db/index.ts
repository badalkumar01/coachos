import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { databaseUrl } from '@/lib/env';
import * as schema from './schema';

/**
 * Drizzle client over postgres.js.
 *
 * Created lazily on first use, not at module evaluation: importing a query
 * module must not require DATABASE_URL, otherwise `next build` fails while
 * collecting page data in an environment that has no database configured.
 *
 * The connection is cached on `globalThis` so dev-server hot reloads reuse one
 * pool instead of opening a new one on every edit.
 */

declare global {
  var __coachosSql: ReturnType<typeof postgres> | undefined;
}

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: Db | null = null;

function getDb(): Db {
  if (cachedDb) return cachedDb;

  const sql =
    globalThis.__coachosSql ??
    postgres(databaseUrl(), {
      // Supabase's connection pooler does not support prepared statements.
      prepare: false,
      max: 10,
    });

  if (process.env.NODE_ENV !== 'production') globalThis.__coachosSql = sql;

  cachedDb = drizzle(sql, { schema });
  return cachedDb;
}

export const db = new Proxy({} as Db, {
  get(_target, property) {
    const instance = getDb();
    const value = Reflect.get(instance, property, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export { schema };
