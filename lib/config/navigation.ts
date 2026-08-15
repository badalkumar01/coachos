import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { SHIPPED_MODULES, type ModuleId, type WorkspaceConfig } from './workspace-config';
import { createTermFormatter, type TermFormatter } from './terminology';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** null = always shown, regardless of enabled modules. */
  moduleId: ModuleId | null;
}

/**
 * Builds the sidebar from `workspace_config`: only modules the coach enabled,
 * intersected with the modules that actually ship today, labelled with the
 * workspace's own terminology.
 */
export function buildNavigation(config: WorkspaceConfig, formatter?: TermFormatter): NavItem[] {
  const t = formatter ?? createTermFormatter(config.terminology);
  const enabled = new Set(config.enabledModules.filter((m) => SHIPPED_MODULES.includes(m)));

  const all: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, moduleId: null },
    { href: '/clients', label: t.pluralTitle('client'), icon: Users, moduleId: 'clients' },
    { href: '/sessions', label: t.pluralTitle('session'), icon: NotebookPen, moduleId: 'sessions' },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays, moduleId: 'scheduling' },
    { href: '/payments', label: 'Payments', icon: CreditCard, moduleId: 'payments' },
    { href: '/settings', label: 'Settings', icon: Settings, moduleId: null },
  ];

  return all.filter((item) => item.moduleId === null || enabled.has(item.moduleId));
}

/** True when `pathname` is inside `href`'s section. */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
