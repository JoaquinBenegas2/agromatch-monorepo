import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMe } from '../../shared/api/hooks/use-me.js';
import { useActiveFarmId, useUser } from '../../shared/user/user-context.js';

/** Selector de tambo en el Topbar, solo para ADVISOR/ADMIN (frontend-shell Q2). */
export function FarmSelect() {
  const { user } = useUser();
  const { data } = useMe();
  const [activeFarmId, setActiveFarmId] = useActiveFarmId();

  if (user.role === 'FARMER') return null;
  const farms = data?.farms ?? [];
  if (farms.length === 0) return null;

  return (
    <Select value={activeFarmId ?? undefined} onValueChange={setActiveFarmId}>
      <SelectTrigger className="w-full min-w-0 sm:w-[220px]">
        <SelectValue placeholder="Elegí un tambo" />
      </SelectTrigger>
      <SelectContent>
        {farms.map((farm) => (
          <SelectItem key={farm.id} value={farm.id}>
            {farm.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
