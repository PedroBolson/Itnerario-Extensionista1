import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  Copy,
  Check,
  RefreshCw,
  Clock,
  User
} from 'lucide-react';

import { getAllParticipants } from '../../lib/progress';
import type { LearningProgress } from '../../lib/progress';

interface ParticipantSummary {
  id: string;
  displayName: string;
  totalLessons: number;
  completedLessons: number;
  totalWatchTime: number;
  lastActive: Date;
  progress: LearningProgress[];
}

export function ParticipantsPage() {
  const [query, setQuery] = useState('');
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'activity'>('activity');

  useEffect(() => {
    const loadParticipants = async () => {
      setIsLoading(true);
      try {
        const allParticipants = await getAllParticipants();
        setParticipants(allParticipants);
      } catch (error) {
        console.error('Erro ao carregar participantes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadParticipants();
  }, []);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar código:', error);
    }
  };

  const filtered = useMemo(() => {
    let result = [...participants]; // Always create new array

    // Filter by search
    const keyword = query.trim().toLowerCase();
    if (keyword) {
      result = result.filter((participant) => (
        `${participant.displayName} ${participant.id}`.toLowerCase().includes(keyword)
      ));
    }

    // Sort - force re-sort every time
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.displayName.localeCompare(b.displayName);
        case 'activity':
          const timeA = new Date(a.lastActive).getTime();
          const timeB = new Date(b.lastActive).getTime();
          return timeB - timeA; // Most recent first
        default:
          return 0;
      }
    });

    return result;
  }, [participants, query, sortBy]);



  const formatWatchTime = (seconds: number) => {
    if (seconds <= 0) return '0 min';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-theme-base text-theme-primary">
      <div className="max-w-[1400px] mx-auto px-6 pt-24 pb-10 space-y-6">
        <header className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Gerenciar Participantes</h1>
            <p className="text-theme-secondary">Visualize, busque e copie códigos de acesso dos participantes.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary w-4 h-4" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-theme bg-theme-surface text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar por código ou nome..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const newSort = e.target.value as 'name' | 'activity';
                    setSortBy(newSort);
                  }}
                  className="pl-8 pr-3 py-2 rounded-xl border border-theme bg-theme-surface text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="activity">Última atividade</option>
                  <option value="name">Nome A-Z</option>
                </select>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-theme-secondary">
                  {sortBy === 'activity' && <Clock size={14} />}
                  {sortBy === 'name' && <User size={14} />}
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 rounded-xl border border-theme bg-theme-surface text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Participantes ({filtered.length})</h2>
            <div className="text-sm text-theme-secondary">
              Ordenado por: {sortBy === 'name' ? 'Nome' : sortBy === 'activity' ? 'Atividade' : 'Progresso'}
            </div>
          </div>

          <AnimatePresence mode="sync">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-theme text-theme-secondary text-center py-12"
              >
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                Carregando participantes...
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-theme text-theme-secondary text-center py-12"
              >
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="text-lg">Nenhum participante encontrado</div>
                <div className="text-sm">Tente ajustar sua busca ou verifique se há participantes cadastrados</div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                layout
                className="space-y-3"
              >
                {filtered.map((participant) => {
                  const daysSinceActive = Math.floor((Date.now() - participant.lastActive.getTime()) / (1000 * 60 * 60 * 24));
                  const isRecentlyActive = daysSinceActive <= 7;

                  return (
                    <motion.div
                      key={participant.id}
                      layout
                      className="rounded-xl border border-theme bg-theme-surface p-4 hover:bg-theme-surface-hover transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRecentlyActive ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
                            }`}>
                            <Users size={20} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-theme-primary truncate">{participant.displayName}</h3>
                              {isRecentlyActive && (
                                <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-xs rounded-full">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-theme-secondary">
                              Último acesso: {daysSinceActive === 0 ? 'Hoje' :
                                daysSinceActive === 1 ? 'Ontem' :
                                  `${daysSinceActive} dias atrás`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <div className="text-center hidden sm:block">
                            <div className="text-lg font-semibold text-theme-primary">{participant.completedLessons}/{participant.totalLessons}</div>
                            <div className="text-xs text-theme-secondary">Aulas</div>
                          </div>

                          <div className="text-center hidden md:block">
                            <div className="text-lg font-semibold text-theme-primary">{formatWatchTime(participant.totalWatchTime)}</div>
                            <div className="text-xs text-theme-secondary">Tempo</div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => copyToClipboard(participant.id)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                            >
                              {copiedCode === participant.id ? (
                                <>
                                  <Check size={14} />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  Copiar
                                </>
                              )}
                            </button>
                            <div className="text-xs text-theme-secondary text-center font-mono bg-theme-base px-2 py-1 rounded">
                              {participant.id}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
