'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, Plus, Search, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { buildNavigation, isNavItemActive } from '@/lib/config/navigation';
import { createTermFormatter } from '@/lib/config/terminology';
import type { WorkspaceConfig } from '@/lib/config/workspace-config';
import { cn } from '@/lib/utils';
import { CommandPalette, useCommandPalette } from './command-palette';
import { ThemeToggle } from './theme-toggle';

export interface AppShellUser {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface AppShellWorkspace {
  id: string;
  name: string;
  slug: string;
}

interface AppShellProps {
  config: WorkspaceConfig;
  workspace: AppShellWorkspace;
  user: AppShellUser;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}

function initials(user: AppShellUser): string {
  const source = user.fullName?.trim() || user.email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AppShell({ config, workspace, user, signOutAction, children }: AppShellProps) {
  const pathname = usePathname();
  const palette = useCommandPalette();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const t = createTermFormatter(config.terminology);
  const navigation = buildNavigation(config, t);

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {navigation.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const workspaceBadge = (
    <div className="flex items-center gap-2 px-3 py-1">
      <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
        {workspace.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{workspace.name}</p>
        <p className="text-muted-foreground truncate text-xs">/{workspace.slug}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar hidden w-60 shrink-0 flex-col gap-4 border-r py-4 md:flex">
        {workspaceBadge}
        <div className="px-3">{navLinks()}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-3 backdrop-blur md:px-6">
          {/* Mobile nav */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="md:hidden" />}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex flex-col gap-4 py-4">
                {workspaceBadge}
                <div className="px-3">{navLinks(() => setMobileNavOpen(false))}</div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            className="text-muted-foreground w-full max-w-xs justify-start gap-2 font-normal"
            onClick={() => palette.setOpen(true)}
          >
            <Search className="size-4" />
            <span className="truncate">Search or jump to…</span>
            <kbd className="bg-muted ml-auto hidden rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
              ⌘K
            </kbd>
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <Button
              render={<Link href="/clients/new" />}
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Plus className="size-4" />
              New {t('client')}
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" />}
                aria-label="Account menu"
              >
                <Avatar className="size-7">
                  {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{user.fullName ?? 'Coach'}</p>
                  <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/settings" />}>
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <DropdownMenuItem
                    render={<button type="submit" />}
                    className="w-full"
                    closeOnClick={false}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>

      <CommandPalette config={config} open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
}
