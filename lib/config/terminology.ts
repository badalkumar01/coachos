import type { Terminology } from './workspace-config';

export type TermKey = keyof Terminology;

/**
 * Terminology helpers. Every user-facing noun for a client/session/program must
 * come from here — never hardcode "client" (spec rule 5).
 *
 * All configured terms are regular English nouns (client, account, student,
 * member, session, lesson, review, engagement, course, plan, cohort), so naive
 * pluralisation is correct for every preset. Irregular terms would need a
 * `pluralOverride` in the config; none exist yet.
 */
export function pluralize(term: string): string {
  if (/(s|x|z|ch|sh)$/i.test(term)) return `${term}es`;
  if (/[^aeiou]y$/i.test(term)) return `${term.slice(0, -1)}ies`;
  return `${term}s`;
}

export function capitalize(term: string): string {
  return term.charAt(0).toUpperCase() + term.slice(1);
}

export function titleCase(term: string): string {
  return term.split(' ').map(capitalize).join(' ');
}

export interface TermFormatter {
  /** Singular, lowercase: "client" */
  (key: TermKey): string;
  /** Singular, title case: "Client" */
  title(key: TermKey): string;
  /** Plural, lowercase: "clients" */
  plural(key: TermKey): string;
  /** Plural, title case: "Clients" */
  pluralTitle(key: TermKey): string;
}

export function createTermFormatter(terminology: Terminology): TermFormatter {
  const t = ((key: TermKey) => terminology[key]) as TermFormatter;
  t.title = (key) => titleCase(terminology[key]);
  t.plural = (key) => pluralize(terminology[key]);
  t.pluralTitle = (key) => titleCase(pluralize(terminology[key]));
  return t;
}
