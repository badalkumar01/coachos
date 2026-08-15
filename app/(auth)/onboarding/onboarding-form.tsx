'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeOnboarding, type OnboardingState } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Continue
    </Button>
  );
}

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(completeOnboarding, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Practice name</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={defaultName}
          placeholder="Dipti Coaching"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
