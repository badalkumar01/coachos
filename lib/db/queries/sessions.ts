import 'server-only';
import { and, asc, count, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { actionItems, clients, sessions } from '@/lib/db/schema';
import type {
  ActionItem,
  NewActionItem,
  NewSession,
  Session,
  SessionStatus,
} from '@/lib/db/schema';

/** Session data access. Workspace-scoped without exception (spec rule 3). */

export interface SessionWithClient extends Session {
  clientName: string;
  clientAvatarUrl: string | null;
}

export interface ListSessionsOptions {
  clientId?: string;
  statuses?: SessionStatus[];
  from?: Date;
  to?: Date;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export async function listSessions(
  workspaceId: string,
  options: ListSessionsOptions = {},
): Promise<{ items: SessionWithClient[]; total: number }> {
  const { clientId, statuses, from, to, order = 'desc', limit = 50, offset = 0 } = options;

  const filters = [eq(sessions.workspaceId, workspaceId)];
  if (clientId) filters.push(eq(sessions.clientId, clientId));
  if (statuses?.length) filters.push(inArray(sessions.status, statuses));
  if (from) filters.push(gte(sessions.scheduledAt, from));
  if (to) filters.push(lt(sessions.scheduledAt, to));

  const where = and(...filters);
  const orderBy = order === 'asc' ? asc(sessions.scheduledAt) : desc(sessions.scheduledAt);

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        session: sessions,
        clientName: clients.fullName,
        clientAvatarUrl: clients.avatarUrl,
      })
      .from(sessions)
      .innerJoin(clients, eq(clients.id, sessions.clientId))
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(sessions).where(where),
  ]);

  return {
    items: rows.map((r) => ({
      ...r.session,
      clientName: r.clientName,
      clientAvatarUrl: r.clientAvatarUrl,
    })),
    total: totals?.value ?? 0,
  };
}

export async function getSession(
  workspaceId: string,
  sessionId: string,
): Promise<SessionWithClient | null> {
  const [row] = await db
    .select({ session: sessions, clientName: clients.fullName, clientAvatarUrl: clients.avatarUrl })
    .from(sessions)
    .innerJoin(clients, eq(clients.id, sessions.clientId))
    .where(and(eq(sessions.workspaceId, workspaceId), eq(sessions.id, sessionId)))
    .limit(1);

  if (!row) return null;
  return { ...row.session, clientName: row.clientName, clientAvatarUrl: row.clientAvatarUrl };
}

export async function createSession(
  workspaceId: string,
  input: Omit<NewSession, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
): Promise<Session> {
  const [row] = await db
    .insert(sessions)
    .values({ ...input, workspaceId })
    .returning();
  return row;
}

export async function updateSession(
  workspaceId: string,
  sessionId: string,
  input: Partial<Omit<NewSession, 'id' | 'workspaceId' | 'createdAt'>>,
): Promise<Session | null> {
  const [row] = await db
    .update(sessions)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(sessions.workspaceId, workspaceId), eq(sessions.id, sessionId)))
    .returning();
  return row ?? null;
}

export async function deleteSession(workspaceId: string, sessionId: string): Promise<boolean> {
  const rows = await db
    .delete(sessions)
    .where(and(eq(sessions.workspaceId, workspaceId), eq(sessions.id, sessionId)))
    .returning({ id: sessions.id });
  return rows.length > 0;
}

/** Sessions scheduled between `start` (inclusive) and `end` (exclusive). */
export async function listSessionsInRange(
  workspaceId: string,
  start: Date,
  end: Date,
): Promise<SessionWithClient[]> {
  const { items } = await listSessions(workspaceId, { from: start, to: end, order: 'asc' });
  return items;
}

/** The next scheduled session for a client, if any. */
export async function getNextSessionForClient(
  workspaceId: string,
  clientId: string,
): Promise<Session | null> {
  const [row] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.workspaceId, workspaceId),
        eq(sessions.clientId, clientId),
        eq(sessions.status, 'scheduled'),
        gte(sessions.scheduledAt, new Date()),
      ),
    )
    .orderBy(asc(sessions.scheduledAt))
    .limit(1);
  return row ?? null;
}

/**
 * Marks scheduled sessions whose end time has passed. Read-only helper used by
 * the dashboard to highlight sessions awaiting a status; the Phase 3 no-show job
 * will update them for real.
 */
export async function listSessionsAwaitingOutcome(
  workspaceId: string,
  limit = 10,
): Promise<SessionWithClient[]> {
  const rows = await db
    .select({ session: sessions, clientName: clients.fullName, clientAvatarUrl: clients.avatarUrl })
    .from(sessions)
    .innerJoin(clients, eq(clients.id, sessions.clientId))
    .where(
      and(
        eq(sessions.workspaceId, workspaceId),
        eq(sessions.status, 'scheduled'),
        lte(sql`${sessions.scheduledAt} + make_interval(mins => ${sessions.durationMin})`, sql`now()`),
      ),
    )
    .orderBy(desc(sessions.scheduledAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r.session,
    clientName: r.clientName,
    clientAvatarUrl: r.clientAvatarUrl,
  }));
}

// ---------------------------------------------------------------------------
// Action items
// ---------------------------------------------------------------------------

export async function listActionItemsForSession(
  workspaceId: string,
  sessionId: string,
): Promise<ActionItem[]> {
  return db
    .select()
    .from(actionItems)
    .where(and(eq(actionItems.workspaceId, workspaceId), eq(actionItems.sessionId, sessionId)))
    .orderBy(asc(actionItems.done), asc(actionItems.dueAt), asc(actionItems.createdAt));
}

export async function createActionItem(
  workspaceId: string,
  input: Omit<NewActionItem, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
): Promise<ActionItem> {
  const [row] = await db
    .insert(actionItems)
    .values({ ...input, workspaceId })
    .returning();
  return row;
}

export async function setActionItemDone(
  workspaceId: string,
  actionItemId: string,
  done: boolean,
): Promise<ActionItem | null> {
  const [row] = await db
    .update(actionItems)
    .set({ done, updatedAt: new Date() })
    .where(and(eq(actionItems.workspaceId, workspaceId), eq(actionItems.id, actionItemId)))
    .returning();
  return row ?? null;
}

export async function deleteActionItem(
  workspaceId: string,
  actionItemId: string,
): Promise<boolean> {
  const rows = await db
    .delete(actionItems)
    .where(and(eq(actionItems.workspaceId, workspaceId), eq(actionItems.id, actionItemId)))
    .returning({ id: actionItems.id });
  return rows.length > 0;
}

export interface OpenActionItem extends ActionItem {
  clientName: string;
}

export async function listOpenActionItems(
  workspaceId: string,
  limit = 10,
): Promise<OpenActionItem[]> {
  const rows = await db
    .select({ item: actionItems, clientName: clients.fullName })
    .from(actionItems)
    .innerJoin(clients, eq(clients.id, actionItems.clientId))
    .where(and(eq(actionItems.workspaceId, workspaceId), eq(actionItems.done, false)))
    .orderBy(asc(actionItems.dueAt), desc(actionItems.createdAt))
    .limit(limit);

  return rows.map((r) => ({ ...r.item, clientName: r.clientName }));
}
