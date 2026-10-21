import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { actionItems, sessions } from '@/lib/db/schema';
import type { ActionItem, Session } from '@/lib/db/schema';

/**
 * The unified client timeline (spec §4.1).
 *
 * Composed from the Phase 0 tables rather than read from `activity_log`, which
 * arrives with the Phase 3 automation layer. Payments, messages and form
 * responses join this union as those modules land — the entry type is a
 * discriminated union so adding a source cannot silently break rendering.
 */

export type TimelineEntry =
  | { kind: 'session'; at: Date; id: string; session: Session }
  | { kind: 'action_item'; at: Date; id: string; actionItem: ActionItem };

export async function getClientTimeline(
  workspaceId: string,
  clientId: string,
  limit = 50,
): Promise<TimelineEntry[]> {
  const scope = (table: typeof sessions | typeof actionItems) =>
    and(eq(table.workspaceId, workspaceId), eq(table.clientId, clientId));

  const [sessionRows, actionRows] = await Promise.all([
    db
      .select()
      .from(sessions)
      .where(scope(sessions))
      .orderBy(desc(sessions.scheduledAt))
      .limit(limit),
    db
      .select()
      .from(actionItems)
      .where(scope(actionItems))
      .orderBy(desc(actionItems.createdAt))
      .limit(limit),
  ]);

  const entries: TimelineEntry[] = [
    ...sessionRows.map(
      (session): TimelineEntry => ({
        kind: 'session',
        at: session.scheduledAt,
        id: session.id,
        session,
      }),
    ),
    // Action items without a session of their own are standalone commitments;
    // those raised inside a session already show under it, so they are skipped.
    ...actionRows
      .filter((item) => item.sessionId === null)
      .map(
        (actionItem): TimelineEntry => ({
          kind: 'action_item',
          at: actionItem.dueAt ?? actionItem.createdAt,
          id: actionItem.id,
          actionItem,
        }),
      ),
  ];

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
