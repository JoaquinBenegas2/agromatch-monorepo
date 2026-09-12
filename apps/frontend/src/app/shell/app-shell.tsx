import { useState } from 'react';
import { Building2, Dna, Handshake, Leaf, Package, Store } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Shell,
  ShellContent,
  ShellMain,
  Sidebar,
  SidebarBrand,
  SidebarNav,
  SidebarNavGroup,
  SidebarNavItem,
} from '@/components/ui/sidebar';
import { Topbar } from '@/components/ui/topbar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { AccountMenu } from './account-menu.js';
import { ChatPanel, ChatToggleButton } from './chat-panel.js';
import { FarmSelect } from './farm-select.js';
import { ModuleTabBar } from './module-tab-bar.js';
import { findModuleByPath, NAV_MODULES } from './nav.js';

const MODULE_ICONS: Record<string, React.ReactNode> = {
  establecimiento: <Building2 />,
  mercado: <Store />,
  'motor-genetico': <Dna />,
  negociacion: <Handshake />,
  ofertas: <Package />,
};

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const activeModule = findModuleByPath(pathname);
  const activeTab = activeModule?.tabs.find((tab) => pathname.startsWith(tab.path));
  // Mercado es un módulo de una sola tab: el breadcrumb solo repetía "Mercado
  // y oportunidades", que la propia pantalla ya muestra como eyebrow. Sacarlo
  // le devuelve el alto que hacía falta para que la pantalla entre sin scroll.
  const showTopbar = pathname !== '/mercado';

  return (
    <Shell>
      <Sidebar>
        <SidebarBrand mark={<Leaf className="size-4" />} name="AgroMatch" subtitle="Torinder" />
        <SidebarNav>
          <SidebarNavGroup label="Tu espacio de trabajo">
            {NAV_MODULES.map((mod) => (
              <SidebarNavItem
                key={mod.id}
                href={mod.tabs[0].path}
                icon={MODULE_ICONS[mod.id]}
                active={activeModule?.id === mod.id}
                subtitle={mod.subtitle}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(mod.tabs[0].path);
                }}
              >
                {mod.label}
              </SidebarNavItem>
            ))}
          </SidebarNavGroup>
        </SidebarNav>
        <AccountMenu />
      </Sidebar>

      <ShellMain>
        {showTopbar && (
          <Topbar>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink>{activeModule?.label ?? ''}</BreadcrumbLink>
                </BreadcrumbItem>
                {activeTab && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeTab.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-3">
              <FarmSelect />
              <ChatToggleButton onClick={() => setChatOpen((open) => !open)} />
            </div>
          </Topbar>
        )}

        <div className="flex flex-1 min-h-0">
          <ShellContent>
            {activeModule && <ModuleTabBar mod={activeModule} />}
            <Outlet />
          </ShellContent>
          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </ShellMain>
    </Shell>
  );
}
