import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, CheckCircle2, Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/empty-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { getDashboardData } from '@/lib/db/queries/dashboard';
import { formatDateTime, formatFullDate, formatTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { workspace, config, user, t } = await requireOnboardedWorkspace();
  const timezone = config.timezone;
  const data = await getDashboardData(workspace.id, timezone);

  const firstName = user.fullName?.split(' ')[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Good to see you, ${firstName}` : 'Dashboard'}
        description={formatFullDate(new Date(), timezone)}
        actions={
          <>
            <Button render={<Link href="/sessions/new" />} variant="outline">
              <Plus className="size-4" />
              {t.title('session')}
            </Button>
            <Button render={<Link href="/clients/new" />}>
              <Plus className="size-4" />
              {t.title('client')}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today&apos;s {t.plural('session')}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{data.todaySessions.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {data.todaySessions.length > 0
              ? `Next at ${formatTime(data.todaySessions[0].scheduledAt, timezone)}`
              : `Nothing scheduled today.`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active {t.plural('client')}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{data.activeClients}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {data.totalClients} total on your books.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open action items</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{data.openActionItems.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Across all your {t.plural('client')}.
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today</CardTitle>
            <CardDescription>
              {t.pluralTitle('session')} scheduled for {formatFullDate(new Date(), timezone)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.todaySessions.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={`No ${t.plural('session')} today`}
                description={`When you book a ${t('session')}, it shows up here with a link to the notes and the video room.`}
                action={
                  <Button render={<Link href="/sessions/new" />} size="sm">
                    Schedule a {t('session')}
                  </Button>
                }
                className="border-0 py-6"
              />
            ) : (
              <ul className="divide-y">
                {data.todaySessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/sessions/${session.id}`}
                      className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors"
                    >
                      <Avatar className="size-8">
                        {session.clientAvatarUrl ? (
                          <AvatarImage src={session.clientAvatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {session.clientName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{session.clientName}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {session.title ?? t.title('session')} · {session.durationMin} min
                        </p>
                      </div>
                      <span className="text-sm tabular-nums">
                        {formatTime(session.scheduledAt, timezone)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coming up</CardTitle>
              <CardDescription>The next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {data.upcomingSessions.length === 0 ? (
                <p className="text-muted-foreground py-2 text-sm">
                  Nothing on the calendar for the week ahead.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.upcomingSessions.map((session) => (
                    <li key={session.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{session.clientName}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {formatDateTime(session.scheduledAt, timezone)}
                        </p>
                      </div>
                      <Badge variant="secondary">{session.durationMin} min</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open action items</CardTitle>
              <CardDescription>Homework and follow-ups still outstanding</CardDescription>
            </CardHeader>
            <CardContent>
              {data.openActionItems.length === 0 ? (
                <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
                  <CheckCircle2 className="size-4" />
                  Nothing outstanding — everything is done.
                </div>
              ) : (
                <ul className="divide-y">
                  {data.openActionItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.title}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          <Users className="mr-1 inline size-3" />
                          {item.clientName}
                          {item.dueAt ? ` · due ${formatDateTime(item.dueAt, timezone)}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
