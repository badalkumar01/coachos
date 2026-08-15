import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Explain what this module is for — first-run should teach, not just sit empty. */
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <div className="bg-muted text-muted-foreground mb-4 flex size-10 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm text-balance">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
