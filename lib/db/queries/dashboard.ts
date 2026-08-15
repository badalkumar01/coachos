import 'server-only';
import { and, count, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import {
  listOpenActionItems,
  listSessionsInRange,
  type OpenActionItem,
  type SessionWithClient,
} from './sessions';

export interface DashboardData {
  todaySessions: SessionWithClient[];
  upcomingSessions: SessionWithClient[];
  activeClients: number;
  totalClients: number;
  openActionItems: OpenActionItem[];
}

/**
 * Everything the dashboard needs, in one pass. `timezone` comes from
 * `workspace_config` so "today" means the coach's today, not the server's.
 */
export async function getDashboardData(
  workspaceId: string,
  timezone: string,
): Promise<DashboardData> {
  const { start, end } = dayBoundsInTimezone(new Date(), timezone);
  const weekEnd = new Date(end.getTime() + 6 * 24 * 60 * 60 * 1000);

  const [todaySessions, weekSessions, activeCount, totalCount, openActionItems] = await Promise.all([
    listSessionsInRange(workspaceId, start, end),
    listSessionsInRange(workspaceId, end, weekEnd),
    db
      .select({ value: count() })
      .from(clients)
      .where(and(eq(clients.workspaceId, workspaceId), eq(clients.status, 'active'))),
    db.select({ value: count() }).from(clients).where(eq(clients.workspaceId, workspaceId)),
    listOpenActionItems(workspaceId, 6),
  ]);

  return {
    todaySessions,
    upcomingSessions: weekSessions.filter((s) => s.status === 'scheduled').slice(0, 5),
    activeClients: activeCount[0]?.value ?? 0,
    totalClients: totalCount[0]?.value ?? 0,
    openActionItems,
  };
}

/**
 * Midnight-to-midnight for `date` as it falls in `timezone`, expressed as UTC
 * instants. Uses Intl rather than a date library so there is no dependency on
 * the server's own timezone.
 */
export function dayBoundsInTimezone(date: Date, timeZone: string): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  // The offset between the wall-clock time in `timeZone` and UTC, at this instant.
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'),
    get('second'),
  );
  const offsetMs = asUtc - Math.floor(date.getTime() / 1000) * 1000;

  const startOfDayUtc = Date.UTC(get('year'), get('month') - 1, get('day'), 0, 0, 0);
  const start = new Date(startOfDayUtc - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
