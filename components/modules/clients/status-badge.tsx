import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS } from '@/lib/validation/clients';
import type { ClientStatus } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

/**
 * Lifecycle status as colour as well as text, so a list scans at a glance.
 * These hues are semantic state — deliberately not the workspace accent.
 */
const STATUS_STYLES: Record<ClientStatus, string> = {
  lead: 'border-transparent bg-sky-500/12 text-sky-700 dark:text-sky-300',
  active: 'border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  paused: 'border-transparent bg-amber-500/14 text-amber-700 dark:text-amber-300',
  completed: 'border-transparent bg-violet-500/12 text-violet-700 dark:text-violet-300',
  churned: 'border-transparent bg-muted text-muted-foreground',
};

export function ClientStatusBadge({
  status,
  className,
}: {
  status: ClientStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
