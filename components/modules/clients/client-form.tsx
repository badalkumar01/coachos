'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/validation/clients';
import type { ClientFormState } from '@/app/(app)/clients/actions';
import type { Client } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

type Action = (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;

interface ClientFormProps {
  action: Action;
  /** Present when editing; drives the default values. */
  client?: Client;
  /** The workspace's word for a client, already title-cased. */
  termTitle: string;
  cancelHref: string;
  submitLabel: string;
}

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

export function ClientForm({
  action,
  client,
  termTitle,
  cancelHref,
  submitLabel,
}: ClientFormProps) {
  const [state, formAction] = useActionState<ClientFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            required
            maxLength={120}
            autoComplete="off"
            defaultValue={client?.fullName ?? ''}
            aria-invalid={Boolean(errors.fullName)}
            placeholder="Aarav Rao"
          />
          <FieldError message={errors.fullName} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            maxLength={254}
            autoComplete="off"
            defaultValue={client?.email ?? ''}
            aria-invalid={Boolean(errors.email)}
            placeholder="aarav@example.com"
          />
          <FieldError message={errors.email} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            maxLength={40}
            autoComplete="off"
            defaultValue={client?.phone ?? ''}
            placeholder="+91 98765 43210"
          />
          <FieldError message={errors.phone} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={client?.status ?? 'lead'}
            className={cn(
              'border-input bg-background h-9 rounded-md border px-3 text-sm',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            )}
          >
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <FieldError message={errors.status} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            maxLength={64}
            autoComplete="off"
            defaultValue={client?.timezone ?? ''}
            placeholder="Asia/Kolkata"
          />
          <FieldError message={errors.timezone} />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            autoComplete="off"
            defaultValue={client?.tags.join(', ') ?? ''}
            placeholder="vip, referral, q4"
          />
          <p className="text-muted-foreground text-xs">Separate with commas. Up to 12.</p>
          <FieldError message={errors.tags} />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="notesSummary">Background</Label>
          <Textarea
            id="notesSummary"
            name="notesSummary"
            rows={4}
            maxLength={2000}
            defaultValue={client?.notesSummary ?? ''}
            placeholder={`What should you remember about this ${termTitle.toLowerCase()} before every session?`}
          />
          <FieldError message={errors.notesSummary} />
        </div>
      </div>

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
