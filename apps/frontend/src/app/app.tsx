import { useEffect, useState } from 'react';
import type { User } from '@org/shared-types';

export function App() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => {
        if (!res.ok) throw new Error(`Backend respondió ${res.status}`);
        return res.json();
      })
      .then(setUsers)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Monorepo Nx + React + Nest</h1>
        <p className="text-slate-400 text-sm">
          Frontend (Vite + Tailwind) hablando con el backend (Nest + Prisma) vía
          <code className="mx-1 rounded bg-slate-800 px-1.5 py-0.5">
            /api/users
          </code>
          .
        </p>

        {error && (
          <p className="rounded-md bg-red-950 border border-red-800 text-red-300 text-sm p-3">
            Error consultando el backend: {error}
          </p>
        )}

        {!error && users === null && (
          <p className="text-slate-400 text-sm">Cargando usuarios...</p>
        )}

        {users && users.length === 0 && (
          <p className="text-slate-400 text-sm">
            No hay usuarios todavía en PostgreSQL. Agregá uno con Prisma Studio.
          </p>
        )}

        {users && users.length > 0 && (
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="rounded-md bg-slate-800 px-3 py-2 text-sm flex justify-between"
              >
                <span>{user.name ?? 'Sin nombre'}</span>
                <span className="text-slate-400">{user.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
