import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser, getWorkspaceContext } from '@/lib/auth/workspace-context';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Set up your workspace' };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  // Idempotent: if onboarding already finished, go straight through.
  const context = await getWorkspaceContext();
  if (context?.workspace.onboardedAt) redirect('/dashboard');

  const suggestedName = user.fullName ? `${user.fullName.split(' ')[0]} Coaching` : '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          This is the name your clients will see on your booking page.
        </p>
      </div>
      <OnboardingForm defaultName={suggestedName} />
    </div>
  );
}
