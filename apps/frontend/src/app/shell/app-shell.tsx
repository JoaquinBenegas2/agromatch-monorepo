import { useEffect, useState } from 'react';
import {
  Building2,
  Dna,
  Handshake,
  Leaf,
  Menu,
  Package,
  Store,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { FarmSelect } from './farm-select.js';
import { ModuleTabBar } from './module-tab-bar.js';
import { findModuleByPath, NAV_MODULES } from './nav.js';
import { GeneticsExperience } from '@/features/genetics/genetics-experience';
import { useActiveFarmId, useUser } from '@/shared/user/user-context';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeModule = findModuleByPath(pathname);
  const activeTab = activeModule?.tabs.find((tab) =>
    pathname.startsWith(tab.path),
  );
  // Mercado es un módulo de una sola tab: el breadcrumb solo repetía "Mercado
  // y oportunidades", que la propia pantalla ya muestra como eyebrow. Sacarlo
  // le devuelve el alto que hacía falta para que la pantalla entre sin scroll.
  const showTopbar = pathname !== '/mercado';
  const geneticExperience =
    /^\/motor-genetico\/(matching|tablero|importar|plan)(\/|$)/.test(
      pathname,
    );
  const [farmId] = useActiveFarmId();
  const { user } = useUser();

  // Título por pantalla: pestaña del navegador, historial y previews de links.
  useEffect(() => {
    const parts = [activeTab?.label, activeModule?.label].filter(
      (p, i, arr) => p && arr.indexOf(p) === i,
    );
    document.title = [...parts, 'AgroMatch'].join(' · ');
  }, [activeModule, activeTab]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 768px)');
    const resize = () => {
      if (desktop.matches) setSidebarOpen(false);
    };
    window.addEventListener('keydown', close);
    desktop.addEventListener('change', resize);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', close);
      desktop.removeEventListener('change', resize);
    };
  }, [sidebarOpen]);

  return (
    <Shell>
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/25 md:hidden"
          aria-label="Cerrar navegación"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-40 bg-card md:sticky md:flex ${sidebarOpen ? 'flex' : 'hidden'}`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 md:hidden"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        >
          <X />
        </Button>
        <SidebarBrand
          mark={<Leaf className="size-4" />}
          name="AgroMatch"
          subtitle="Torinder"
        />
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
                  setSidebarOpen(false);
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
        {!showTopbar && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-4 mt-2 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir navegación"
            aria-expanded={sidebarOpen}
            aria-controls="app-navigation"
          >
            <Menu />
          </Button>
        )}
        {showTopbar && (
          <Topbar>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Abrir navegación"
              aria-expanded={sidebarOpen}
              aria-controls="app-navigation"
            >
              <Menu />
            </Button>
            <Breadcrumb className="min-w-0 flex-1">
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
            <div className="flex w-full min-w-0 items-center justify-end gap-3 empty:hidden sm:w-auto">
              <FarmSelect />
            </div>
          </Topbar>
        )}

        <div className="flex flex-1 min-h-0">
          <ShellContent className="min-w-0 p-4 sm:p-8">
            {activeModule && <ModuleTabBar mod={activeModule} />}
            {geneticExperience ? (
              <GeneticsExperience key={`${user.id}:${farmId}`}>
                <Outlet />
              </GeneticsExperience>
            ) : (
              <Outlet />
            )}
          </ShellContent>
        </div>
      </ShellMain>
    </Shell>
  );
}
