import { z } from 'zod';

/**
 * Environment access.
 *
 * Required vars are validated lazily (on first use) rather than at import time,
 * so that `next build` and tooling still run in an environment that only has a
 * subset configured. Optional integration keys return `undefined` and their
 * adapters fail loudly at call time with an actionable message.
 */

function missing(name: string): never {
  throw new Error(
    `Missing environment variable ${name}. ` +
      `Copy .env.example to .env.local and fill it in — see README.md.`,
  );
}

const connectionStringSchema = z
  .string()
  .min(1)
  .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
    message: 'DATABASE_URL must be a Postgres connection string',
  });

/** The Supabase Postgres connection string. Read on first query, not at import. */
export function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) missing('DATABASE_URL');

  const parsed = connectionStringSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'DATABASE_URL is invalid.');
  }
  return parsed.data;
}

/** Only needed by trusted server code that bypasses RLS. */
export function serviceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? missing('SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Public vars. These must be referenced as literal `process.env.NEXT_PUBLIC_*`
 * expressions for Next.js to inline them into the client bundle — do not
 * rewrite these as dynamic lookups.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
} as const;

/**
 * The app's own origin, used to build OAuth and email-confirmation redirects.
 *
 * Server-side only — it reads Vercel's deployment vars, which are not exposed
 * to the browser. Resolution order:
 *
 *   1. NEXT_PUBLIC_APP_URL, when set explicitly (local dev, custom domain).
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the stable production domain Vercel
 *      injects into every deployment, preview builds included. Preview URLs are
 *      deliberately not used: Supabase only allows redirects back to domains on
 *      its allowlist, and that is the production one.
 *   3. localhost, for `next build` and tooling outside Vercel.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

export function requirePublicEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local and fill them in — see README.md.',
    );
  }
  return { supabaseUrl: publicEnv.supabaseUrl, supabaseAnonKey: publicEnv.supabaseAnonKey };
}

/** Optional integration keys. Adapters check these and fail with guidance. */
export const integrationEnv = {
  stripeSecretKey: () => process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET,
  stripeConnectClientId: () => process.env.STRIPE_CONNECT_CLIENT_ID,
  googleCalendarClientId: () => process.env.GOOGLE_CALENDAR_CLIENT_ID,
  googleCalendarClientSecret: () => process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  dailyApiKey: () => process.env.DAILY_API_KEY,
  resendApiKey: () => process.env.RESEND_API_KEY,
  anthropicApiKey: () => process.env.ANTHROPIC_API_KEY,
  deepgramApiKey: () => process.env.DEEPGRAM_API_KEY,
} as const;

export function requireIntegrationKey(
  key: keyof typeof integrationEnv,
  envName: string,
  capability: string,
): string {
  const value = integrationEnv[key]();
  if (!value) {
    throw new Error(
      `${capability} is not configured: ${envName} is missing. ` +
        `Add it to .env.local, or switch this workspace's ${capability} provider in Settings.`,
    );
  }
  return value;
}
