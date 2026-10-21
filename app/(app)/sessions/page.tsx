import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/empty-state';
import { SessionStatusBadge } from '@/components/modules/sessions/session-status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { listSessions } from '@/lib/db/queries/sessions';
import { countClientsByStatus } from '@/lib/db/queries/clients';
import { formatDateTime, formatRelative } from '@/lib/format';
import { sessionStatusValues } from '@/lib/validation/sessions';
import { SESSION_STATUS_LABELS } from '@/components/modules/sessions/session-status-badge';
import type { SessionStatus } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Sessions' };

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default async function SessionsPage({ searchParams }: PageProps<'/sessions'>) {
  const { workspace, config, t } = await requireOnboardedWorkspace();
  const params = await searchParams;

  const view: FilterKey =
    params.view === 'past' || params.view === 'all' ? params.view : 'upcoming';
  const statusFilter =
    typeof params.status === 'string' &&
    (sessionStatusValues as readonly string[]).includes(params.status)
      ? (params.status as SessionStatus)
      : undefined;

  const now = new Date();
  const { items, total } = await listSessions(workspace.id, {
    from: view === 'upcoming' ? now : undefined,
    to: view === 'past' ? now : undefined,
    order: view === 'upcoming' ? 'asc' : 'desc',
    statuses: statusFilter ? [statusFilter] : undefined,
    limit: 100,
  });

  const counts = await countClientsByStatus(workspace.id);
  const hasClients = Object.values(counts).some((count) => count > 0);

  const tabHref = (key: FilterKey) => {
    const query = new URLSearchParams();
    if (key !== 'upcoming') query.set('view', key);
    if (statusFilter) query.set('status', statusFilter);
    const qs = query.toString();
    return qs ? `/sessions?${qs}` : '/sessions';
  };

  const statusHref = (status?: SessionStatus) => {
    const query = new URLSearchParams();
    if (view !== 'upcoming') query.set('view', view);
    if (status) query.set('status', status);
    const qs = query.toString();
    return qs ? `/sessions?${qs}` : '/sessions';
  };

  return (
    <>
      <PageHeader
        title={t.pluralTitle('session')}
        description={
          view === 'upcoming'
            ? `${total} upcoming`
            : view === 'past'
              ? `${total} in the past`
              : `${total} in total`
        }
        actions={
          hasClients ? (
            <Button render={<Link href="/sessions/new" />}>
              <Plus className="size-4" />
              New {t('session')}
            </Button>
          ) : null
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={tabHref(filter.key)}
            aria-current={view === filter.key ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              view === filter.key
                ? 'bg-foreground text-background border-transparent'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {filter.label}
          </Link>
        ))}

        <span className="bg-border mx-1 hidden h-4 w-px sm:block" aria-hidden="true" />

        <Link
          href={statusHref(undefined)}
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs transition-colors',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            !statusFilter
              ? 'bg-foreground text-background border-transparent'
              : 'text-muted-foreground hover:bg-muted',
          )}
        >
          Any status
        </Link>
        {sessionStatusValues.map((status) => (
          <Link
            key={status}
            href={statusHref(statusFilter === status ? undefined : status)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              statusFilter === status
                ? 'bg-foreground text-background border-transparent'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {SESSION_STATUS_LABELS[status]}
          </Link>
        ))}
      </div>

      {!hasClients ? (
        <EmptyState
          icon={CalendarDays}
          title={`Add a ${t('client')} first`}
          description={`A ${t('session')} always belongs to someone. Create your first ${t('client')} record and you can book straight from their page.`}
          action={
            <Button render={<Link href="/clients/new" />}>
              <Plus className="size-4" />
              New {t('client')}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            view === 'upcoming'
              ? `No upcoming ${t.plural('session')}`
              : `No ${t.plural('session')} here`
          }
          description={
            view === 'upcoming'
              ? `Nothing is on the calendar. Book a ${t('session')} and it will show up here and on your dashboard.`
              : `Nothing matches this view. Try a different filter.`
          }
          action={
            view === 'upcoming' ? (
              <Button render={<Link href="/sessions/new" />}>
                <Plus className="size-4" />
                New {t('session')}
              </Button>
            ) : (
              <Button variant="outline" render={<Link href="/sessions" />}>
                Back to upcoming
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <ul className="divide-y">
            {items.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                >
                  <Avatar className="size-9">
                    {session.clientAvatarUrl ? (
                      <AvatarImage src={session.clientAvatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {session.clientName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{session.clientName}</p>
                      <SessionStatusBadge status={session.status} />
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {session.title ?? t.title('session')} · {session.durationMin} min
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs tabular-nums">
                      {formatDateTime(session.scheduledAt, config.timezone)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelative(session.scheduledAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
