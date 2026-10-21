'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Check, Eye, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SessionFormState } from '@/app/(app)/sessions/actions';

interface SessionNotesProps {
  action: (state: SessionFormState, formData: FormData) => Promise<SessionFormState>;
  privateNotes: string | null;
  sharedNotes: string | null;
  /** Workspace terminology, lowercase singular. */
  clientTerm: string;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Save notes
    </Button>
  );
}

/** Only shown once a save has completed without error. */
function SavedHint({ state }: { state: SessionFormState }) {
  const { pending } = useFormStatus();
  if (pending || !state.saved) return null;
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs" role="status">
      <Check className="size-3.5" />
      Saved
    </span>
  );
}

export function SessionNotes({
  action,
  privateNotes,
  sharedNotes,
  clientTerm,
}: SessionNotesProps) {
  const [state, formAction] = useActionState<SessionFormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="privateNotes" className="flex items-center gap-1.5">
          <Lock className="text-muted-foreground size-3.5" />
          Private notes
        </Label>
        <Textarea
          id="privateNotes"
          name="privateNotes"
          rows={8}
          maxLength={20000}
          defaultValue={privateNotes ?? ''}
          placeholder="What happened, what you noticed, what to watch for next time."
        />
        <p className="text-muted-foreground text-xs">
          Never leaves your workspace. The {clientTerm} cannot see this.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sharedNotes" className="flex items-center gap-1.5">
          <Eye className="text-muted-foreground size-3.5" />
          Shared notes
        </Label>
        <Textarea
          id="sharedNotes"
          name="sharedNotes"
          rows={6}
          maxLength={20000}
          defaultValue={sharedNotes ?? ''}
          placeholder="The recap your client receives — decisions, commitments, next steps."
        />
        <p className="text-muted-foreground text-xs">
          Visible to the {clientTerm} once the client portal ships.
        </p>
      </div>

      {state.error ? (
        <p className="text-destructive flex items-center gap-2 text-sm" role="alert">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SaveButton />
        <SavedHint state={state} />
      </div>
    </form>
  );
}
