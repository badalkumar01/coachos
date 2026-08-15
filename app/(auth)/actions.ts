'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { WORKSPACE_COOKIE } from '@/lib/auth/workspace-context';
import { cookies } from 'next/headers';

export interface AuthFormState {
  error?: string;
  message?: string;
}

const credentialsSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const signUpSchema = credentialsSchema.extend({
  fullName: z.string().min(1, 'Tell us your name.').max(120),
});

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Please check the form and try again.';
}

export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Those credentials did not work. Check your email and password.' };

  const next = formData.get('next');
  revalidatePath('/', 'layout');
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/dashboard');
}

export async function signUpWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv.appUrl}/auth/callback`,
    },
  });

  if (error) {
    return {
      error:
        error.message === 'User already registered'
          ? 'An account with that email already exists. Try signing in.'
          : error.message,
    };
  }

  // With email confirmation enabled, Supabase returns a user but no session.
  if (!data.session) {
    return { message: 'Check your inbox — we sent you a link to confirm your email.' };
  }

  revalidatePath('/', 'layout');
  redirect('/onboarding');
}

export async function signInWithGoogle(): Promise<never> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${publicEnv.appUrl}/auth/callback` },
  });

  if (error || !data.url) {
    redirect(`/sign-in?error=${encodeURIComponent('Could not start Google sign-in.')}`);
  }
  redirect(data.url);
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(WORKSPACE_COOKIE);

  revalidatePath('/', 'layout');
  redirect('/sign-in');
}
