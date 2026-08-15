'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInWithGoogle, type AuthFormState } from './actions';

type Action = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
  action: Action;
  /** Where to send the user after a successful sign-in. */
  next?: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Continue with Google
    </Button>
  );
}

export function AuthForm({ mode, action, next }: AuthFormProps) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});
  const isSignUp = mode === 'sign-up';

  return (
    <div className="flex flex-col gap-6">
      <form action={signInWithGoogle}>
        <GoogleButton />
      </form>

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {isSignUp ? (
          <div className="grid gap-2">
            <Label htmlFor="fullName">Your name</Label>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              required
              placeholder="Dipti Kumar"
            />
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={8}
            placeholder={isSignUp ? 'At least 8 characters' : ''}
          />
        </div>

        {state.error ? (
          <p
            role="alert"
            className="text-destructive flex items-start gap-2 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        ) : null}

        {state.message ? (
          <p role="status" className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            {state.message}
          </p>
        ) : null}

        <SubmitButton label={isSignUp ? 'Create account' : 'Sign in'} />
      </form>
    </div>
  );
}
