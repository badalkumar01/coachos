import { Badge } from '@/components/ui/badge';
import type { SessionStatus } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
};

const SESSION_STATUS_STYLES: Record<SessionStatus, string> = {
  scheduled: 'border-transparent bg-sky-500/12 text-sky-700 dark:text-sky-300',
  completed: 'border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  no_show: 'border-transparent bg-amber-500/14 text-amber-700 dark:text-amber-300',
  cancelled: 'border-transparent bg-muted text-muted-foreground',
};

export function SessionStatusBadge({
  status,
  className,
}: {
  status: SessionStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(SESSION_STATUS_STYLES[status], className)}>
      {SESSION_STATUS_LABELS[status]}
    </Badge>
  );
}
