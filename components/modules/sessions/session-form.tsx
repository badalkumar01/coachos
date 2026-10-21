'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SESSION_STATUS_LABELS } from '@/components/modules/sessions/session-status-badge';
import { SESSION_STATUS_ORDER } from '@/lib/validation/sessions';
import { DURATION_OPTIONS } from '@/lib/time';
import type { SessionFormState } from '@/app/(app)/sessions/actions';
import type { SessionStatus } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

type Action = (state: SessionFormState, formData: FormData) => Promise<SessionFormState>;

export interface ClientOption {
  id: string;
  fullName: string;
}

interface SessionFormProps {
  action: Action;
  clients: ClientOption[];
  defaults: {
    clientId?: string;
    title?: string | null;
    type?: string | null;
    status?: SessionStatus;
    scheduledAt: string;
    durationMin: number;
    videoUrl?: string | null;
    agenda?: string | null;
    privateNotes?: string | null;
    sharedNotes?: string | null;
  };
  /** Workspace terminology, lowercase singular. */
  clientTerm: string;
  sessionTerm: string;
  timezone: string;
  cancelHref: string;
  submitLabel: string;
}

const selectClass = cn(
  'border-input bg-background h-9 rounded-md border px-3 text-sm',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
);

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-destructive flex items-center gap-1.5 text-xs" role="alert">
      <AlertCircle className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function SessionForm({
  action,
  clients,
  defaults,
  clientTerm,
  sessionTerm,
  timezone,
  cancelHref,
  submitLabel,
}: SessionFormProps) {
  const [state, formAction] = useActionState<SessionFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="clientId">Who is this {sessionTerm} for?</Label>
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={defaults.clientId ?? ''}
            className={selectClass}
            aria-invalid={Boolean(errors.clientId)}
          >
            <option value="" disabled>
              Choose a {clientTerm}…
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.fullName}
              </option>
            ))}
          </select>
          <FieldError message={errors.clientId} />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            maxLength={160}
            defaultValue={defaults.title ?? ''}
            placeholder="Weekly 1:1"
          />
          <FieldError message={errors.title} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="scheduledAt">Date and time</Label>
          <Input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            required
            defaultValue={defaults.scheduledAt}
            aria-invalid={Boolean(errors.scheduledAt)}
          />
          <p className="text-muted-foreground text-xs">Times are in {timezone}.</p>
          <FieldError message={errors.scheduledAt} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="durationMin">Duration</Label>
          <select
            id="durationMin"
            name="durationMin"
            defaultValue={String(defaults.durationMin)}
            className={selectClass}
          >
            {/* Keep an unusual saved duration selectable rather than silently changing it. */}
            {(DURATION_OPTIONS as readonly number[]).includes(defaults.durationMin)
              ? null
              : (
                  <option value={String(defaults.durationMin)}>
                    {defaults.durationMin} minutes
                  </option>
                )}
            {DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={String(minutes)}>
                {minutes} minutes
              </option>
            ))}
          </select>
          <FieldError message={errors.durationMin} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status ?? 'scheduled'}
            className={selectClass}
          >
            {SESSION_STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {SESSION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <FieldError message={errors.status} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="type">Type</Label>
          <Input
            id="type"
            name="type"
            maxLength={60}
            defaultValue={defaults.type ?? ''}
            placeholder="Discovery, check-in, review…"
          />
          <FieldError message={errors.type} />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="videoUrl">Video link</Label>
          <Input
            id="videoUrl"
            name="videoUrl"
            type="url"
            maxLength={500}
            defaultValue={defaults.videoUrl ?? ''}
            aria-invalid={Boolean(errors.videoUrl)}
            placeholder="https://meet.google.com/…"
          />
          <p className="text-muted-foreground text-xs">
            Paste your own link for now — CoachOS will generate one automatically once a video
            provider is connected.
          </p>
          <FieldError message={errors.videoUrl} />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="agenda">Agenda</Label>
          <Textarea
            id="agenda"
            name="agenda"
            rows={3}
            maxLength={4000}
            defaultValue={defaults.agenda ?? ''}
            placeholder="What are you covering?"
          />
          <FieldError message={errors.agenda} />
        </div>
      </div>

      {/* Notes are edited on the session page, but must survive an edit round-trip. */}
      <input type="hidden" name="privateNotes" value={defaults.privateNotes ?? ''} />
      <input type="hidden" name="sharedNotes" value={defaults.sharedNotes ?? ''} />

      {state.error ? (
        <p className="text-destructive flex items-center gap-2 text-sm" role="alert">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <SubmitButton label={submitLabel} />
        <Button variant="ghost" render={<Link href={cancelHref} />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
