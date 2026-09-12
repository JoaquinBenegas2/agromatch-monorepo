import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { VersionTag } from '@/components/ui/version-tag';
import { useUser } from '../../shared/user/user-context.js';
import type { NavModule } from './nav.js';

function visibleTabs(mod: NavModule, role: string) {
  return mod.tabs.filter(
    (tab) => !tab.roles || tab.roles.includes(role as never),
  );
}

export function ModuleTabBar({ mod }: { mod: NavModule }) {
  const { pathname } = useLocation();
  const { user } = useUser();
  const tabs = visibleTabs(mod, user.role);

  if (tabs.length <= 1) return null;

  return (
    <nav
      aria-label="Secciones del módulo"
      className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-1"
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.path);
        return (
          <Link
            key={tab.path}
            to={tab.path}
            data-state={active ? 'active' : 'inactive'}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-3.5 py-2 text-[11.5px] font-medium text-muted-foreground transition-colors',
              "before:size-1 before:shrink-0 before:scale-0 before:rounded-full before:bg-primary before:transition-transform before:content-['']",
              'hover:text-foreground',
              'data-[state=active]:border-secondary-border data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:before:scale-100',
            )}
          >
            {tab.label}
            {tab.status === 'pending' && <VersionTag>pendiente</VersionTag>}
          </Link>
        );
      })}
    </nav>
  );
}
