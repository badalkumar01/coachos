import { AppShell } from '@/components/layout/app-shell';
import { requireOnboardedWorkspace } from '@/lib/auth/workspace-context';
import { signOut } from '@/app/(auth)/actions';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const { user, workspace, config } = await requireOnboardedWorkspace();

  return (
    <AppShell
      config={config}
      workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
      user={{ email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl }}
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  );
}
