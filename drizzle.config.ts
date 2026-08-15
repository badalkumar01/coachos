import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Next.js, so it does not pick up .env.local on its own.
loadEnv({ path: '.env.local', quiet: true });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
