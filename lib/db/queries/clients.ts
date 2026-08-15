import 'server-only';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { actionItems, clients, sessions } from '@/lib/db/schema';
import type { Client, ClientStatus, NewClient } from '@/lib/db/schema';

/**
 * Client data access. Every function takes `workspaceId` first and filters on
 * it — a query here without that filter is a bug (spec rule 3).
 */

export interface ListClientsOptions {
  search?: string;
  statuses?: ClientStatus[];
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface ClientListItem extends Client {
  sessionCount: number;
  nextSessionAt: Date | null;
}

export async function listClients(
  workspaceId: string,
  options: ListClientsOptions = {},
): Promise<{ items: ClientListItem[]; total: number }> {
  const { search, statuses, tags, limit = 50, offset = 0 } = options;

  const filters = [eq(clients.workspaceId, workspaceId)];

  if (search?.trim()) {
    const needle = `%${search.trim()}%`;
    const match = or(ilike(clients.fullName, needle), ilike(clients.email, needle));
    if (match) filters.push(match);
  }
  if (statuses?.length) {
    filters.push(inArray(clients.status, statuses));
  }
  if (tags?.length) {
    filters.push(sql`${clients.tags} && ${tags}::text[]`);
  }

  const where = and(...filters);

  const [items, [totals]] = await Promise.all([
    db
      .select({
        client: clients,
        sessionCount: sql<number>`(
          select count(*)::int from ${sessions}
          where ${sessions.workspaceId} = ${workspaceId}
            and ${sessions.clientId} = ${clients.id}
        )`,
        nextSessionAt: sql<Date | null>`(
          select min(${sessions.scheduledAt}) from ${sessions}
          where ${sessions.workspaceId} = ${workspaceId}
            and ${sessions.clientId} = ${clients.id}
            and ${sessions.status} = 'scheduled'
            and ${sessions.scheduledAt} >= now()
        )`,
      })
      .from(clients)
      .where(where)
      .orderBy(asc(clients.fullName))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(clients).where(where),
  ]);

  return {
    items: items.map((row) => ({
      ...row.client,
      sessionCount: row.sessionCount,
      nextSessionAt: row.nextSessionAt,
    })),
    total: totals?.value ?? 0,
  };
}

export async function getClient(workspaceId: string, clientId: string): Promise<Client | null> {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.workspaceId, workspaceId), eq(clients.id, clientId)))
    .limit(1);
  return row ?? null;
}

export async function createClient(
  workspaceId: string,
  input: Omit<NewClient, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
): Promise<Client> {
  const [row] = await db
    .insert(clients)
    .values({ ...input, workspaceId })
    .returning();
  return row;
}

export async function updateClient(
  workspaceId: string,
  clientId: string,
  input: Partial<Omit<NewClient, 'id' | 'workspaceId' | 'createdAt'>>,
): Promise<Client | null> {
  const [row] = await db
    .update(clients)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(clients.workspaceId, workspaceId), eq(clients.id, clientId)))
    .returning();
  return row ?? null;
}

export async function deleteClient(workspaceId: string, clientId: string): Promise<boolean> {
  const rows = await db
    .delete(clients)
    .where(and(eq(clients.workspaceId, workspaceId), eq(clients.id, clientId)))
    .returning({ id: clients.id });
  return rows.length > 0;
}

/** Distinct tags in use across the workspace — powers the filter bar. */
export async function listClientTags(workspaceId: string): Promise<string[]> {
  const rows = await db
    .select({ tag: sql<string>`distinct unnest(${clients.tags})` })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));
  return rows.map((r) => r.tag).sort();
}

export async function countClientsByStatus(
  workspaceId: string,
): Promise<Record<ClientStatus, number>> {
  const rows = await db
    .select({ status: clients.status, value: count() })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .groupBy(clients.status);

  const result: Record<ClientStatus, number> = {
    lead: 0,
    active: 0,
    paused: 0,
    completed: 0,
    churned: 0,
  };
  for (const row of rows) result[row.status] = row.value;
  return result;
}

/** Lightweight options list for pickers (session form, command palette). */
export async function listClientOptions(
  workspaceId: string,
): Promise<Array<{ id: string; fullName: string; email: string | null }>> {
  return db
    .select({ id: clients.id, fullName: clients.fullName, email: clients.email })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(asc(clients.fullName));
}

/** Open action items for a client, soonest due first. */
export async function listOpenActionItemsForClient(workspaceId: string, clientId: string) {
  return db
    .select()
    .from(actionItems)
    .where(
      and(
        eq(actionItems.workspaceId, workspaceId),
        eq(actionItems.clientId, clientId),
        eq(actionItems.done, false),
      ),
    )
    .orderBy(asc(actionItems.dueAt), desc(actionItems.createdAt));
}
