import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';
import { VersionTag } from '@/components/ui/version-tag';

/**
 * Shell de layout (sidebar + contenido) que replica /designs/tokens.css
 * (.shell, .sidebar, .main, .nav-item, .nav-group, .account-row).
 * SidebarNavItem soporta `asChild` para envolver un <Link>/<NavLink> de
 * react-router-dom sin perder los estilos ni el estado activo.
 */

function Shell({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="shell"
      className={cn('flex min-h-screen', className)}
      {...props}
    />
  );
}

function Sidebar({ className, ...props }: React.ComponentProps<'aside'>) {
  return (
    <aside
      data-slot="sidebar"
      className={cn(
        'sticky top-0 flex h-dvh w-[264px] max-w-[85vw] shrink-0 flex-col border-r border-border bg-[#E4E8D8]',
        className,
      )}
      {...props}
    />
  );
}

interface SidebarBrandProps extends React.ComponentProps<'div'> {
  mark: React.ReactNode;
  name: React.ReactNode;
  subtitle?: React.ReactNode;
}

function SidebarBrand({
  className,
  mark,
  name,
  subtitle,
  ...props
}: SidebarBrandProps) {
  return (
    <div
      data-slot="sidebar-brand"
      className={cn('flex items-center gap-2.5 px-4 pt-[18px] pb-4', className)}
      {...props}
    >
      <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[4px_14px_4px_4px] bg-primary text-[14px] font-bold text-primary-foreground">
        {mark}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] leading-tight font-bold tracking-tight">
          {name}
        </div>
        {subtitle && (
          <div className="truncate text-[10.5px] text-ink-3">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

function SidebarNav({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="sidebar-nav"
      className={cn(
        'flex flex-1 flex-col gap-[18px] overflow-y-auto py-1.5',
        className,
      )}
      {...props}
    />
  );
}

interface SidebarNavGroupProps extends React.ComponentProps<'div'> {
  label?: React.ReactNode;
}

function SidebarNavGroup({
  className,
  label,
  children,
  ...props
}: SidebarNavGroupProps) {
  return (
    <div
      data-slot="sidebar-nav-group"
      className={cn('flex flex-col gap-0.5 px-3', className)}
      {...props}
    >
      {label && (
        <div className="mb-2 px-2.5 text-[9.5px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

interface SidebarNavItemProps extends React.ComponentProps<'a'> {
  icon?: React.ReactNode;
  active?: boolean;
  version?: string;
  subtitle?: React.ReactNode;
  asChild?: boolean;
}

function SidebarNavItem({
  className,
  icon,
  active,
  version,
  subtitle,
  asChild,
  children,
  ...props
}: SidebarNavItemProps) {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      data-slot="sidebar-nav-item"
      data-active={active ? 'true' : undefined}
      className={cn(
        'group flex items-center gap-2.5 rounded-full px-3 py-2.5 text-[12.5px] font-medium text-muted-foreground transition-[background-color,color,transform] duration-200',
        '[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-ink-3 [&_svg]:transition-colors',
        'hover:translate-x-0.5 hover:bg-border-soft hover:text-foreground hover:[&_svg]:text-current',
        'data-[active=true]:bg-primary data-[active=true]:font-semibold data-[active=true]:text-primary-foreground data-[active=true]:shadow-[0_8px_18px_-10px_rgba(30,76,58,0.6)] data-[active=true]:[&_svg]:text-current',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block truncate">{children}</span>
        {subtitle && (
          <span className="block truncate text-[10px] font-normal text-ink-4 group-data-[active=true]:text-primary-foreground/70">
            {subtitle}
          </span>
        )}
      </span>
      {version && <VersionTag>{version}</VersionTag>}
    </Comp>
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn(
        'flex flex-col gap-2 border-t border-border p-3',
        className,
      )}
      {...props}
    />
  );
}

interface SidebarAccountProps extends React.ComponentProps<'div'> {
  avatar: React.ReactNode;
  name: React.ReactNode;
  meta?: React.ReactNode;
}

function SidebarAccount({
  className,
  avatar,
  name,
  meta,
  ...props
}: SidebarAccountProps) {
  return (
    <div
      data-slot="sidebar-account"
      className={cn(
        'flex items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-muted',
        className,
      )}
      {...props}
    >
      {avatar}
      <div className="min-w-0">
        <div className="truncate text-[12px] leading-tight font-semibold">
          {name}
        </div>
        {meta && (
          <div className="truncate text-[10.5px] text-ink-3">{meta}</div>
        )}
      </div>
    </div>
  );
}

function ShellMain({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="shell-main"
      className={cn('flex min-w-0 flex-1 flex-col', className)}
      {...props}
    />
  );
}

function ShellContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="shell-content"
      className={cn('flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-8', className)}
      {...props}
    />
  );
}

export {
  Shell,
  Sidebar,
  SidebarBrand,
  SidebarNav,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarFooter,
  SidebarAccount,
  ShellMain,
  ShellContent,
};
