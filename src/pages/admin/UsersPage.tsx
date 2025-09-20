import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldCheck, UserCog } from 'lucide-react';

type AdminUser = {
  email: string;
  role: string;
  lastLogin?: string;
};

const DEFAULT_ADMIN_USERS: AdminUser[] = [
  { email: 'coordenador@projeto.com', role: 'Coordenador', lastLogin: '—' },
  { email: 'educador@projeto.com', role: 'Educador', lastLogin: '—' },
];

export function UsersPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEFAULT_ADMIN_USERS;
    return DEFAULT_ADMIN_USERS.filter((user) => user.email.toLowerCase().includes(q) || user.role.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="min-h-screen bg-transparent text-theme-primary p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Equipe Administrativa</h1>
            <p className="text-sm text-theme-secondary">Controle de contas com acesso ao painel.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary w-4 h-4" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-theme bg-theme-surface text-sm"
              placeholder="Buscar por email ou função"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((user) => (
            <motion.div
              key={user.email}
              layout
              className="rounded-2xl border border-theme bg-theme-surface px-5 py-4 shadow-sm space-y-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 grid place-items-center">
                  <UserCog size={20} />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{user.email}</div>
                  <div className="text-xs text-theme-secondary">{user.role}</div>
                </div>
              </div>
              <div className="text-xs text-theme-secondary flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                Último acesso: {user.lastLogin || '—'}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
