import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Search, ShieldCheck, UserPlus, UserCog } from 'lucide-react';

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
    <div className="min-h-screen bg-theme-base text-theme-primary">
      <div className="max-w-[960px] lg:max-w-[1100px] mx-auto px-6 pt-24 pb-10 space-y-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Equipe Administrativa</h1>
            <p className="text-theme-secondary">Gerencie quem pode acessar o painel interno. Admins são autenticados pelo Firebase.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary w-4 h-4" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-theme bg-theme-base text-sm"
                placeholder="Buscar por email ou função"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button
              className="px-4 py-2 rounded-xl border border-theme text-theme-secondary hover:bg-theme-surface-hover flex items-center gap-2 text-sm"
              type="button"
            >
              <UserPlus size={16} />
              Convidar admin
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-theme bg-theme-surface p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 grid place-items-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-sm text-theme-secondary">Total de admins</div>
              <div className="text-xl font-semibold">{DEFAULT_ADMIN_USERS.length}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-theme bg-theme-surface p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 grid place-items-center">
              <Mail size={20} />
            </div>
            <div>
              <div className="text-sm text-theme-secondary">Autenticação</div>
              <div className="text-xs text-theme-secondary/80">Controle via Firebase Authentication</div>
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-theme text-theme-secondary text-center py-12"
            >
              Nenhum administrador corresponde à busca.
            </motion.div>
          ) : (
            <motion.div
              key="list"
              layout
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {filtered.map((user) => (
                <motion.div
                  key={user.email}
                  layout
                  className="rounded-2xl border border-theme bg-theme-surface px-5 py-4 space-y-2"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
