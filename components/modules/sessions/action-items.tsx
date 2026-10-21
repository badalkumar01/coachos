'use client';

import { useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Loader2, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SessionFormState } from '@/app/(app)/sessions/actions';
import type { ActionItem } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface ActionItemsProps {
  items: ActionItem[];
  addAction: (state: SessionFormState, formData: FormData) => Promise<SessionFormState>;
  toggleAction: (formData: FormData) => Promise<void>;
  removeAction: (actionItemId: string) => Promise<void>;
  /** Pre-formatted in the workspace timezone, keyed by action item id. */
  dueLabels: Record<string, string>;
  overdueIds: string[];
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      Add
    </Button>
  );
}

export function ActionItems({
  items,
  addAction,
  toggleAction,
  removeAction,
  dueLabels,
  overdueIds,
}: ActionItemsProps) {
  const [state, formAction] = useActionState<SessionFormState, FormData>(addAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-2.5">
              {/* A form per row so toggling one does not submit the others. */}
              <form action={toggleAction} className="flex items-start pt-0.5">
                <input type="hidden" name="actionItemId" value={item.id} />
                <input type="hidden" name="done" value={item.done ? 'false' : 'true'} />
                <button
                  type="submit"
                  aria-label={item.done ? `Reopen: ${item.title}` : `Complete: ${item.title}`}
                  className={cn(
                    'size-4 rounded border transition-colors',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                    item.done
                      ? 'bg-foreground border-foreground'
                      : 'border-muted-foreground hover:border-foreground',
                  )}
                >
                  {item.done ? (
                    <svg viewBox="0 0 16 16" className="text-background size-full p-0.5">
                      <path
                        d="M3 8.5l3 3 7-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              </form>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm',
                    item.done ? 'text-muted-foreground line-through' : '',
                  )}
                >
                  {item.title}
                </p>
                {dueLabels[item.id] ? (
                  <p className="text-muted-foreground text-xs">Due {dueLabels[item.id]}</p>
                ) : null}
              </div>

              {!item.done && overdueIds.includes(item.id) ? (
                <Badge
                  variant="outline"
                  className="border-transparent bg-amber-500/14 text-amber-700 dark:text-amber-300"
                >
                  Overdue
                </Badge>
              ) : null}

              <form action={removeAction.bind(null, item.id)}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove: ${item.title}`}
                  className="text-muted-foreground"
                >
                  <X className="size-3.5" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nothing assigned yet. Add what they are taking away from this session.
        </p>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end"
      >
        <div className="grid flex-1 gap-2">
          <Label htmlFor="title" className="text-xs">
            New action item
          </Label>
          <Input
            id="title"
            name="title"
            required
            maxLength={300}
            autoComplete="off"
            placeholder="Draft the 90-day plan"
            aria-invalid={Boolean(state.fieldErrors?.title)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueAt" className="text-xs">
            Due
          </Label>
          <Input id="dueAt" name="dueAt" type="date" className="w-auto" />
        </div>
        <AddButton />
      </form>

      {state.error ? (
        <p className="text-destructive flex items-center gap-2 text-sm" role="alert">
          <AlertCircle className="size-4 shrink-0" />
          {state.fieldErrors?.title ?? state.error}
        </p>
      ) : null}
    </div>
  );
}
