import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@org/shared-types';
import { findUser, SIMULATED_USERS } from './users.js';

const STORAGE_KEY = 'agromatch:userId';
const DEFAULT_USER_ID = SIMULATED_USERS[0]?.id ?? 'tambero-a';

/**
 * Getter sincrónico fuera de React, para que `shared/api` lea el usuario
 * activo sin depender del árbol de componentes (REQ-FS-02).
 */
export function getActiveUserId(): string {
  if (typeof window === 'undefined') return DEFAULT_USER_ID;
  return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_USER_ID;
}

interface UserContextValue {
  user: User;
  users: User[];
  setUserId: (id: string) => void;
  /** Tambo elegido por un ADVISOR/ADMIN en el selector del Topbar (null = el primero). */
  selectedFarmId: string | null;
  setSelectedFarmId: (farmId: string | null) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [userId, setUserIdState] = useState<string>(getActiveUserId);
  // Vive en el contexto (no en cada componente) para que el selector del
  // Topbar y las pantallas de cada flujo hablen del mismo tambo.
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  const setUserId = useCallback(
    (id: string) => {
      window.localStorage.setItem(STORAGE_KEY, id);
      setUserIdState(id);
      setSelectedFarmId(null);
      // REQ-FS-02: cambiar de usuario invalida todas las queries.
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const value = useMemo<UserContextValue>(
    () => ({
      user: findUser(userId) ?? SIMULATED_USERS[0],
      users: SIMULATED_USERS,
      setUserId,
      selectedFarmId,
      setSelectedFarmId,
    }),
    [userId, setUserId, selectedFarmId],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser debe usarse dentro de <UserProvider>');
  return ctx;
}

/** El tambo activo: único para FARMER, elegible para ADVISOR/ADMIN. */
export function useActiveFarmId(): [string | null, (farmId: string) => void] {
  const { user, selectedFarmId, setSelectedFarmId } = useUser();
  const selected =
    selectedFarmId && user.farmIds.includes(selectedFarmId)
      ? selectedFarmId
      : null;
  const activeFarmId =
    user.role === 'FARMER'
      ? (user.farmIds[0] ?? null)
      : (selected ?? user.farmIds[0] ?? null);
  return [activeFarmId, setSelectedFarmId];
}
