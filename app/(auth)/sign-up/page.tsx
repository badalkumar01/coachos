import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthForm } from '../auth-form';
import { signUpWithPassword } from '../actions';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Run your whole practice from one place. Free while you set it up.
        </p>
      </div>

      <AuthForm mode="sign-up" action={signUpWithPassword} />

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
