import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Circle,
  Clock,
  Mail,
  Pencil,
  Phone,
  Tag,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ClientStatusBadge } from '@/components/modules/clients/status-badge';
import { SessionStatusBadge } from '@/components/modules/sessions/session-status-badge';
import { DeleteClientButton } from '@/components/modules/clients/delete-client-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { getClient, listOpenActionItemsForClient } from '@/lib/db/queries/clients';
import { getClientTimeline } from '@/lib/db/queries/timeline';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { deleteClientAction } from '../actions';

export async function generateMetadata({
  params,
}: PageProps<'/clients/[clientId]'>): Promise<Metadata> {
  const { clientId } = await params;
  const { workspace } = await requireOnboardedWorkspace();
  const client = await getClient(workspace.id, clientId);
  return { title: client?.fullName ?? 'Client' };
}

export default async function ClientDetailPage({ params }: PageProps<'/clients/[clientId]'>) {
  const { clientId } = await params;
  const { workspace, config, t } = await requireOnboardedWorkspace();

  const client = await getClient(workspace.id, clientId);
  if (!client) notFound();

  const [timeline, openItems] = await Promise.all([
    getClientTimeline(workspace.id, clientId),
    listOpenActionItemsForClient(workspace.id, clientId),
  ]);

  const tz = config.timezone;
  const initials = client.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <>
      <PageHeader
        title={client.fullName}
        description={`Added ${formatDate(client.createdAt, tz)}`}
        actions={
          <>
            <Button
              variant="outline"
              render={<Link href={`/clients/${client.id}/edit`} />}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button render={<Link href={`/sessions/new?clientId=${client.id}`} />}>
              <CalendarPlus className="size-4" />
              Book {t('session')}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        {/* Left rail — who this person is */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <Avatar className="size-16">
                {client.avatarUrl ? <AvatarImage src={client.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{client.fullName}</p>
                <div className="mt-1.5 flex justify-center">
                  <ClientStatusBadge status={client.status} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-2.5">
                <Mail className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="min-w-0 break-words underline-offset-4 hover:underline"
                  >
                    {client.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No email</span>
                )}
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {client.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No phone</span>
                )}
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span className={client.timezone ? '' : 'text-muted-foreground'}>
                  {client.timezone ?? 'No timezone set'}
                </span>
              </div>

              {client.tags.length > 0 ? (
                <div className="flex items-start gap-2.5">
                  <Tag className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {client.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="font-normal">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {client.notesSummary ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Background</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{client.notesSummary}</p>
              </CardContent>
            </Card>
          ) : null}

          <DeleteClientButton
            clientName={client.fullName}
            term={t('client')}
            sessionTermPlural={t.plural('session')}
            action={deleteClientAction.bind(null, client.id)}
          />
        </div>

        {/* Centre — the timeline */}
        <div className="flex flex-col gap-6">
          {openItems.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Open action items</CardTitle>
                <CardDescription>Still outstanding for {client.fullName}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {openItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5 py-2.5">
                      <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{item.title}</p>
                        {item.dueAt ? (
                          <p className="text-muted-foreground text-xs">
                            Due {formatDateTime(item.dueAt, tz)}
                          </p>
                        ) : null}
                      </div>
                      {item.dueAt && item.dueAt < new Date() ? (
                        <Badge
                          variant="outline"
                          className="border-transparent bg-amber-500/14 text-amber-700 dark:text-amber-300"
                        >
                          Overdue
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Timeline</CardTitle>
              <CardDescription>
                Every {t('session')} and commitment, newest first
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nothing here yet</p>
                    <p className="text-muted-foreground mt-1 max-w-xs text-sm text-balance">
                      Book a {t('session')} and it will appear here with its notes and action
                      items.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    render={<Link href={`/sessions/new?clientId=${client.id}`} />}
                  >
                    Book a {t('session')}
                  </Button>
                </div>
              ) : (
                <ol className="relative flex flex-col">
                  {timeline.map((entry, index) => (
                    <li key={`${entry.kind}-${entry.id}`} className="relative flex gap-3 pb-5">
                      {/* Connector, omitted on the final entry */}
                      {index < timeline.length - 1 ? (
                        <span
                          className="bg-border absolute top-7 left-[11px] h-full w-px"
                          aria-hidden="true"
                        />
                      ) : null}

                      <span
                        className={
                          entry.kind === 'session'
                            ? 'bg-background text-muted-foreground relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border'
                            : 'bg-background text-muted-foreground relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border'
                        }
                      >
                        {entry.kind === 'session' ? (
                          <CalendarDays className="size-3.5" />
                        ) : entry.actionItem.done ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <Circle className="size-3.5" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        {entry.kind === 'session' ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/sessions/${entry.session.id}`}
                                className="text-sm font-medium underline-offset-4 hover:underline"
                              >
                                {entry.session.title ?? t.title('session')}
                              </Link>
                              <SessionStatusBadge status={entry.session.status} />
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {formatDateTime(entry.at, tz)} · {entry.session.durationMin} min ·{' '}
                              {formatRelative(entry.at)}
                            </p>
                            {entry.session.sharedNotes ? (
                              <p className="mt-1.5 line-clamp-2 text-sm">
                                {entry.session.sharedNotes}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">{entry.actionItem.title}</p>
                            <p className="text-muted-foreground text-xs">
                              Action item ·{' '}
                              {entry.actionItem.dueAt
                                ? `due ${formatDateTime(entry.actionItem.dueAt, tz)}`
                                : 'no due date'}
                              {entry.actionItem.done ? ' · done' : ''}
                            </p>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
