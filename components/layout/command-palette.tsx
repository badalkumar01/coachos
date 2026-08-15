'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Plus, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { buildNavigation } from '@/lib/config/navigation';
import { createTermFormatter } from '@/lib/config/terminology';
import type { WorkspaceConfig } from '@/lib/config/workspace-config';

interface CommandPaletteProps {
  config: WorkspaceConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ config, open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const t = createTermFormatter(config.terminology);
  const navigation = buildNavigation(config, t);

  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Jump to a page or create something new."
    >
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Go to">
          {navigation.map((item) => (
            <CommandItem
              key={item.href}
              value={item.label}
              onSelect={() => run(() => router.push(item.href))}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Create">
          <CommandItem
            value={`new ${t('client')}`}
            onSelect={() => run(() => router.push('/clients/new'))}
          >
            <Plus className="size-4" />
            <span>New {t('client')}</span>
          </CommandItem>
          <CommandItem
            value={`new ${t('session')}`}
            onSelect={() => run(() => router.push('/sessions/new'))}
          >
            <Plus className="size-4" />
            <span>New {t('session')}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Preferences">
          <CommandItem
            value="toggle theme dark light"
            onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}
          >
            {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span>Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** Registers the Cmd/Ctrl-K shortcut and owns the palette's open state. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return { open, setOpen };
}
