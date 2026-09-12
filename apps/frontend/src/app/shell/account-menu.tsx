import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarAccount, SidebarFooter } from '@/components/ui/sidebar';
import { useUser } from '../../shared/user/user-context.js';

const ROLE_LABEL: Record<string, string> = {
  FARMER: 'Tambero',
  ADVISOR: 'Asesor',
  ADMIN: 'Admin',
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** REQ-FS-02: la fila de cuenta del pie del sidebar es el selector de usuario simulado. */
export function AccountMenu() {
  const { user, users, setUserId } = useUser();

  return (
    <SidebarFooter>
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full text-left">
          <SidebarAccount
            avatar={
              <Avatar>
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
            }
            name={user.name}
            meta={`${ROLE_LABEL[user.role]} · simulado`}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuLabel>Cambiar de usuario simulado</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {users.map((candidate) => (
            <DropdownMenuItem key={candidate.id} onSelect={() => setUserId(candidate.id)}>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{candidate.name}</span>
                <span className="text-ink-3">{ROLE_LABEL[candidate.role]}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>
  );
}
