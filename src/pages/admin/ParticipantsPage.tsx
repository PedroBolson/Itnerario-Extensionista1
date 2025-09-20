import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserCircle2, Clock, CheckCircle2, Video } from 'lucide-react';

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

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return participants;
    return participants.filter((participant) => (
      `${participant.displayName} ${participant.id}`.toLowerCase().includes(keyword)
    ));
  }, [participants, query]);

  const stats = useMemo(() => {
    const totalParticipants = participants.length;
    const totalLessons = participants.reduce((sum, participant) => sum + participant.totalLessons, 0);
    const totalCompleted = participants.reduce((sum, participant) => sum + participant.completedLessons, 0);
    const totalWatchTime = participants.reduce((sum, participant) => sum + participant.totalWatchTime, 0);

    return {
      totalParticipants,
      totalLessons,
      totalCompleted,
      totalWatchTime,
    };
  }, [participants]);

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
      <div className="max-w-[1200px] xl:max-w-[1400px] mx-auto px-6 pt-24 pb-10 space-y-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Progresso dos Participantes</h1>
            <p className="text-theme-secondary">Acompanhe engajamento, aulas concluídas e tempo de tela por código.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary w-4 h-4" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-theme bg-theme-base text-sm"
              placeholder="Buscar por código ou nome"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-theme bg-theme-surface p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 grid place-items-center">
              <UserCircle2 size={20} />
            </div>
            <div>
              <div className="text-sm text-theme-secondary">Participantes</div>
              <div className="text-xl font-semibold">{stats.totalParticipants}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-theme bg-theme-surface p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 grid place-items-center">
              <Video size={20} />
            </div>
            <div>
              <div className="text-sm text-theme-secondary">Aulas registradas</div>
              <div className="text-xl font-semibold">{stats.totalLessons}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-theme bg-theme-surface p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 grid place-items-center">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-sm text-theme-secondary">Concluídas</div>
              <div className="text-xl font-semibold">{stats.totalCompleted}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-theme bg-theme-surface p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 grid place-items-center">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-sm text-theme-secondary">Tempo assistido</div>
              <div className="text-xl font-semibold">{formatWatchTime(stats.totalWatchTime)}</div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lista de participantes</h2>
            <span className="text-sm text-theme-secondary">{filtered.length} encontrado(s)</span>
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
                Nenhum participante corresponde à busca.
              </motion.div>
            ) : (
              <motion.div
                key="list"
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filtered.map((participant) => (
                  <motion.div
                    key={participant.id}
                    layout
                    className="rounded-2xl border border-theme bg-theme-surface px-5 py-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-theme-primary">{participant.displayName}</div>
                        <div className="text-xs text-theme-secondary">Código: {participant.id}</div>
                      </div>
                      <div className="text-xs text-theme-secondary">
                        Último acesso: {participant.lastActive.toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-base rounded-full">
                        <Video size={14} />
                        {participant.completedLessons}/{participant.totalLessons} aulas
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-base rounded-full">
                        <Clock size={14} />
                        {formatWatchTime(participant.totalWatchTime)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-theme-secondary">
                      {participant.progress.slice(0, 4).map((lesson) => {
                        const progressPercent = lesson.duration > 0
                          ? Math.round((lesson.lastPosition / lesson.duration) * 100)
                          : 0;
                        return (
                          <div key={lesson.id} className="flex items-center gap-2">
                            <span className="truncate flex-1">{lesson.lessonTitle || 'Aula'}</span>
                            <span className="text-theme-primary font-medium">{progressPercent}%</span>
                            {lesson.completed && <CheckCircle2 size={14} className="text-emerald-500" />}
                          </div>
                        );
                      })}
                      {participant.progress.length > 4 && (
                        <div className="text-xs text-theme-secondary">+{participant.progress.length - 4} aulas adicionais</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
