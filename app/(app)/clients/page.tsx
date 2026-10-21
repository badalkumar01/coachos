import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus, Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/empty-state';
import { ClientStatusBadge } from '@/components/modules/clients/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { listClients, listClientTags } from '@/lib/db/queries/clients';
import { STATUS_LABELS, STATUS_ORDER, clientStatusValues } from '@/lib/validation/clients';
import { formatDateTime } from '@/lib/format';
import type { ClientStatus } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Clients' };

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function parseStatus(value: string | undefined): ClientStatus[] | undefined {
  if (!value) return undefined;
  const candidates = value
    .split(',')
    .filter((v): v is ClientStatus => (clientStatusValues as readonly string[]).includes(v));
  return candidates.length ? candidates : undefined;
}

/** Keeps the other filters intact when one chip is toggled. */
function hrefWith(
  base: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/clients?${query}` : '/clients';
}

export default async function ClientsPage({ searchParams }: PageProps<'/clients'>) {
  const { workspace, config, t } = await requireOnboardedWorkspace();
  const params = await searchParams;

  const search = typeof params.q === 'string' ? params.q : undefined;
  const statusParam = typeof params.status === 'string' ? params.status : undefined;
  const tag = typeof params.tag === 'string' ? params.tag : undefined;
  const statuses = parseStatus(statusParam);

  const [{ items, total }, allTags] = await Promise.all([
    listClients(workspace.id, { search, statuses, tags: tag ? [tag] : undefined }),
    listClientTags(workspace.id),
  ]);

  const current = { q: search, status: statusParam, tag };
  const isFiltered = Boolean(search || statusParam || tag);

  return (
    <>
      <PageHeader
        title={t.pluralTitle('client')}
        description={
          total === 1
            ? `1 ${t('client')} on your books`
            : `${total} ${t.plural('client')} on your books`
        }
        actions={
          <Button render={<Link href="/clients/new" />}>
            <Plus className="size-4" />
            New {t('client')}
          </Button>
        }
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            name="q"
            defaultValue={search ?? ''}
            placeholder={`Search ${t.plural('client')}…`}
            className="pl-8"
            aria-label={`Search ${t.plural('client')}`}
          />
        </div>
        {statusParam ? <input type="hidden" name="status" value={statusParam} /> : null}
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        <Button type="submit" variant="outline">
          Search
        </Button>
        {isFiltered ? (
          <Button variant="ghost" render={<Link href="/clients" />}>
            Clear
          </Button>
        ) : null}
      </form>

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {STATUS_ORDER.map((status) => {
          const active = statuses?.includes(status) ?? false;
          return (
            <Link
              key={status}
              href={hrefWith(current, { status: active ? undefined : status })}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                active
                  ? 'bg-foreground text-background border-transparent'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {STATUS_LABELS[status]}
            </Link>
          );
        })}

        {allTags.length > 0 ? (
          <span className="bg-border mx-1 hidden h-4 w-px sm:block" aria-hidden="true" />
        ) : null}

        {allTags.slice(0, 8).map((candidate) => (
          <Link
            key={candidate}
            href={hrefWith(current, { tag: tag === candidate ? undefined : candidate })}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              tag === candidate
                ? 'bg-foreground text-background border-transparent'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            #{candidate}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={Search}
            title="Nothing matches those filters"
            description={`No ${t.plural('client')} match what you searched for. Try a different term, or clear the filters.`}
            action={
              <Button variant="outline" render={<Link href="/clients" />}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title={`No ${t.plural('client')} yet`}
            description={`Every ${t('session')}, note and action item hangs off a ${t('client')} record. Add your first one to get started.`}
            action={
              <Button render={<Link href="/clients/new" />}>
                <Plus className="size-4" />
                Add your first {t('client')}
              </Button>
            }
          />
        )
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <ul className="divide-y">
            {items.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}`}
                  className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                >
                  <Avatar className="size-9">
                    {client.avatarUrl ? <AvatarImage src={client.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="text-xs">
                      {initialsOf(client.fullName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{client.fullName}</p>
                      <ClientStatusBadge status={client.status} />
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {client.email ?? 'No email on file'}
                      {client.tags.length > 0
                        ? ` · ${client.tags.map((x) => `#${x}`).join(' ')}`
                        : ''}
                    </p>
                  </div>

                  <div className="hidden text-right sm:block">
                    <p className="text-xs">
                      {client.nextSessionAt ? (
                        formatDateTime(client.nextSessionAt, config.timezone)
                      ) : (
                        <span className="text-muted-foreground">Nothing booked</span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {client.sessionCount === 1
                        ? `1 ${t('session')}`
                        : `${client.sessionCount} ${t.plural('session')}`}
                    </p>
                  </div>

                  <Badge variant="secondary" className="sm:hidden">
                    {client.sessionCount}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
