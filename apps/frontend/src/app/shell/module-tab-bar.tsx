import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { VersionTag } from '@/components/ui/version-tag';
import { useUser } from '../../shared/user/user-context.js';
import type { NavModule } from './nav.js';

function visibleTabs(mod: NavModule, role: string) {
  return mod.tabs.filter((tab) => !tab.roles || tab.roles.includes(role as never));
}

export function ModuleTabBar({ mod }: { mod: NavModule }) {
  const { pathname } = useLocation();
  const { user } = useUser();
  const tabs = visibleTabs(mod, user.role);

  if (tabs.length <= 1) return null;

  return (
    <div className="inline-flex w-fit items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.path);
        return (
          <Link
            key={tab.path}
            to={tab.path}
            data-state={active ? 'active' : 'inactive'}
            className={cn(
              'inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors',
              'hover:text-foreground',
              'data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary',
            )}
          >
            {tab.label}
            {tab.status === 'pending' && <VersionTag>pendiente</VersionTag>}
          </Link>
        );
      })}
    </div>
  );
}
