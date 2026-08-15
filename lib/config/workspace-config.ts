import { z } from 'zod';

/**
 * The single source of truth for how a workspace's UI adapts to its coach.
 *
 * This object is versioned and validated so new fields can be added safely:
 * `parseWorkspaceConfig` fills defaults for anything missing, which means a
 * config written by an older build still loads under a newer one.
 */

export const CONFIG_VERSION = 1;

// ---------------------------------------------------------------------------
// Archetypes
// ---------------------------------------------------------------------------

export const archetypes = [
  'life',
  'consultant',
  'executive',
  'fitness',
  'career',
  'tutor',
  'financial',
  'cohort',
] as const;

export const archetypeSchema = z.enum(archetypes);
export type Archetype = z.infer<typeof archetypeSchema>;

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export const modules = [
  'clients',
  'sessions',
  'scheduling',
  'programs',
  'payments',
  'feedback',
  'documents',
  'messages',
] as const;

export const moduleSchema = z.enum(modules);
export type ModuleId = z.infer<typeof moduleSchema>;

/**
 * Modules that actually have routes today. An archetype may enable a Phase 2
 * module (e.g. `programs`); navigation intersects `enabledModules` with this
 * list so config stays forward-compatible without rendering dead links.
 */
export const SHIPPED_MODULES: readonly ModuleId[] = [
  'clients',
  'sessions',
  'scheduling',
  'payments',
] as const;

// ---------------------------------------------------------------------------
// Dashboard widgets
// ---------------------------------------------------------------------------

export const dashboardWidgets = [
  'today_sessions',
  'active_clients',
  'revenue_mtd',
  'quick_actions',
  'checkins_due',
  'open_action_items',
] as const;

export const dashboardWidgetSchema = z.enum(dashboardWidgets);
export type DashboardWidget = z.infer<typeof dashboardWidgetSchema>;

export const SHIPPED_WIDGETS: readonly DashboardWidget[] = [
  'today_sessions',
  'active_clients',
  'revenue_mtd',
  'quick_actions',
  'open_action_items',
] as const;

// ---------------------------------------------------------------------------
// Terminology
// ---------------------------------------------------------------------------

export const terminologySchema = z.object({
  client: z.string().min(1).max(32),
  session: z.string().min(1).max(32),
  program: z.string().min(1).max(32),
});
export type Terminology = z.infer<typeof terminologySchema>;

// ---------------------------------------------------------------------------
// Providers (see lib/integrations)
// ---------------------------------------------------------------------------

export const capabilities = [
  'calendar',
  'scheduling',
  'video',
  'payments',
  'email',
  'transcription',
  'storage',
] as const;

export const capabilitySchema = z.enum(capabilities);
export type Capability = z.infer<typeof capabilitySchema>;

/** Which provider ids are legal for each capability. */
export const providersByCapability = {
  calendar: ['native', 'google_calendar', 'microsoft_outlook'],
  scheduling: ['native', 'calendly', 'cal_com'],
  video: ['native', 'zoom', 'google_meet'],
  payments: ['stripe_connect', 'razorpay'],
  email: ['native', 'gmail', 'outlook'],
  transcription: ['native', 'upload'],
  storage: ['native', 'google_drive'],
} as const satisfies Record<Capability, readonly string[]>;

export type ProviderId<C extends Capability> =
  (typeof providersByCapability)[C][number];

export const providersSchema = z.object({
  calendar: z.enum(providersByCapability.calendar),
  scheduling: z.enum(providersByCapability.scheduling),
  video: z.enum(providersByCapability.video),
  payments: z.enum(providersByCapability.payments),
  email: z.enum(providersByCapability.email),
  transcription: z.enum(providersByCapability.transcription),
  storage: z.enum(providersByCapability.storage),
});
export type Providers = z.infer<typeof providersSchema>;

export const DEFAULT_PROVIDERS: Providers = {
  calendar: 'native',
  scheduling: 'native',
  video: 'native',
  payments: 'stripe_connect',
  email: 'native',
  transcription: 'native',
  storage: 'native',
};

// ---------------------------------------------------------------------------
// Session defaults
// ---------------------------------------------------------------------------

export const sessionDefaultsSchema = z.object({
  durationMin: z.number().int().min(5).max(480),
  bufferMin: z.number().int().min(0).max(120),
  minNoticeMin: z.number().int().min(0).max(60 * 24 * 14),
});
export type SessionDefaults = z.infer<typeof sessionDefaultsSchema>;

export const DEFAULT_SESSION_DEFAULTS: SessionDefaults = {
  durationMin: 50,
  bufferMin: 10,
  minNoticeMin: 60 * 12,
};

// ---------------------------------------------------------------------------
// The config object
// ---------------------------------------------------------------------------

export const workspaceConfigSchema = z.object({
  version: z.number().int().positive().default(CONFIG_VERSION),
  archetype: archetypeSchema.default('life'),
  terminology: terminologySchema.default({
    client: 'client',
    session: 'session',
    program: 'program',
  }),
  enabledModules: z.array(moduleSchema).default([...SHIPPED_MODULES]),
  dashboardWidgets: z.array(dashboardWidgetSchema).default([...SHIPPED_WIDGETS]),
  providers: providersSchema.default(DEFAULT_PROVIDERS),
  currency: z.string().length(3).toUpperCase().default('USD'),
  timezone: z.string().min(1).default('UTC'),
  sessionDefaults: sessionDefaultsSchema.default(DEFAULT_SESSION_DEFAULTS),
});

export type WorkspaceConfig = z.infer<typeof workspaceConfigSchema>;

/**
 * Parse an unknown (possibly older, possibly partial) config into a complete
 * one. Never throws on missing fields — only on fields present but invalid.
 */
export function parseWorkspaceConfig(input: unknown): WorkspaceConfig {
  return workspaceConfigSchema.parse(input ?? {});
}

// ---------------------------------------------------------------------------
// Archetype presets — what onboarding writes when a coach picks a type
// ---------------------------------------------------------------------------

export interface ArchetypePreset {
  id: Archetype;
  label: string;
  description: string;
  terminology: Terminology;
  enabledModules: ModuleId[];
  dashboardWidgets: DashboardWidget[];
}

export const ARCHETYPE_PRESETS: Record<Archetype, ArchetypePreset> = {
  life: {
    id: 'life',
    label: 'Life / mindset coach',
    description: 'One-to-one sessions, goals, reflection and accountability.',
    terminology: { client: 'client', session: 'session', program: 'program' },
    enabledModules: ['clients', 'sessions', 'scheduling', 'payments', 'feedback'],
    dashboardWidgets: ['today_sessions', 'active_clients', 'open_action_items', 'revenue_mtd'],
  },
  consultant: {
    id: 'consultant',
    label: 'Business / startup consultant',
    description: 'Accounts and engagements, deliverables, retainers and invoicing.',
    terminology: { client: 'account', session: 'engagement', program: 'retainer' },
    enabledModules: ['clients', 'sessions', 'scheduling', 'payments', 'programs', 'documents'],
    dashboardWidgets: ['today_sessions', 'active_clients', 'revenue_mtd', 'quick_actions'],
  },
  executive: {
    id: 'executive',
    label: 'Executive coach',
    description: 'Confidential notes, 360 feedback and long-running engagements.',
    terminology: { client: 'client', session: 'engagement', program: 'programme' },
    enabledModules: ['clients', 'sessions', 'scheduling', 'payments', 'feedback', 'documents'],
    dashboardWidgets: ['today_sessions', 'active_clients', 'open_action_items', 'revenue_mtd'],
  },
  fitness: {
    id: 'fitness',
    label: 'Health / fitness coach',
    description: 'Programs, check-ins, habits and progress metrics.',
    terminology: { client: 'client', session: 'session', program: 'program' },
    enabledModules: ['clients', 'sessions', 'scheduling', 'programs', 'payments', 'feedback'],
    dashboardWidgets: ['today_sessions', 'active_clients', 'checkins_due', 'revenue_mtd'],
  },
  career: {
    id: 'career',
    label: 'Career coach',
    description: 'Sessions, documents and action items between meetings.',
    terminology: { client: 'client', session: 'session', program: 'package' },
    enabledModules: ['clients', 'sessions', 'scheduling', 'payments', 'documents'],
    dashboardWidgets: ['today_sessions', 'active_clients', 'open_action_items', 'revenue_mtd'],
  },
  tutor: {
    id: 'tutor',
    label: 'Tutor / academic coach',
    description: 'Students, courses, scheduling and progress over a term.',
    terminology: { client: 'student', session: 'lesson', program: 'course' },
    enabledModules: ['clients', 'sessions', 'scheduling', 'programs', 'payments'],
    dashboardWidgets: ['today_sessions', 'active_clients', 'revenue_mtd', 'quick_actions'],
  },
  financial: {
    id: 'financial',
    label: 'Financial coach',
    description: 'Plans, milestones, documents and recurring reviews.',
    terminology: { client: 'client', session: 'review', program: 'plan' },
    enabledModules: ['clients', 'sessions', 'scheduling', 'payments', 'documents'],
    dashboardWidgets: ['today_sessions', 'active_clients', 'revenue_mtd', 'quick_actions'],
  },
  cohort: {
    id: 'cohort',
    label: 'Group / cohort coach',
    description: 'Members, cohorts, group sessions and shared resources.',
    terminology: { client: 'member', session: 'group session', program: 'cohort' },
    enabledModules: ['clients', 'sessions', 'scheduling', 'programs', 'payments', 'feedback'],
    dashboardWidgets: ['today_sessions', 'active_clients', 'revenue_mtd', 'quick_actions'],
  },
};

/** Build the config an archetype implies, before the rest of onboarding refines it. */
export function configFromArchetype(archetype: Archetype): WorkspaceConfig {
  const preset = ARCHETYPE_PRESETS[archetype];
  return parseWorkspaceConfig({
    version: CONFIG_VERSION,
    archetype,
    terminology: preset.terminology,
    enabledModules: preset.enabledModules,
    dashboardWidgets: preset.dashboardWidgets,
  });
}
