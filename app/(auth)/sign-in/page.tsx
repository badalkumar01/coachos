import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthForm } from '../auth-form';
import { signInWithPassword } from '../actions';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  const error = typeof params.error === 'string' ? params.error : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sign in to your CoachOS workspace.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <AuthForm mode="sign-in" action={signInWithPassword} next={next} />

      <p className="text-muted-foreground text-center text-sm">
        New here?{' '}
        <Link href="/sign-up" className="text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
