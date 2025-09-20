import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, UserCircle2, Clock, CheckCircle2 } from 'lucide-react';
import { getAllParticipants, type LearningProgress } from '../../lib/progress';

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
        console.error('Error loading participants:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadParticipants();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => [p.id, p.displayName].join(' ').toLowerCase().includes(q));
  }, [participants, query]);

  return (
    <div className="min-h-screen bg-transparent text-theme-primary p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Participantes</h1>
            <p className="text-sm text-theme-secondary">Progresso agregado de todos os códigos gerados.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary w-4 h-4" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-theme bg-theme-surface text-sm"
              placeholder="Buscar por código ou nome"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="text-lg font-medium text-theme-secondary">Carregando participantes...</div>
            </div>
          ) : (
            filtered.map((participant) => (
              <motion.div
                key={participant.id}
                layout
                className="rounded-2xl border border-theme bg-theme-surface p-5 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 grid place-items-center">
                      <UserCircle2 size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-theme-primary">{participant.displayName}</div>
                      <div className="text-xs text-theme-secondary">ID: {participant.id.slice(-8)}</div>
                    </div>
                  </div>
                  <div className="text-xs text-theme-secondary flex items-center gap-1">
                    <Clock size={14} />
                    {participant.lastActive.toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Progresso:</span>
                    <span className="font-medium">{participant.completedLessons}/{participant.totalLessons} aulas</span>
                  </div>

                  {participant.progress.length === 0 && (
                    <div className="text-sm text-theme-secondary">Nenhuma aula registrada ainda.</div>
                  )}

                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {participant.progress.slice(0, 5).map((progress) => (
                      <div key={progress.id} className="rounded-xl border border-theme bg-theme-surface-hover px-3 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="truncate flex-1">
                            <div className="font-medium text-theme-primary text-sm truncate">
                              {progress.lessonTitle || 'Aula'}
                            </div>
                            <div className="text-theme-secondary truncate">
                              {progress.contentTitle || 'Curso'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span>{Math.round((progress.lastPosition / progress.duration) * 100) || 0}%</span>
                            {progress.completed && <CheckCircle2 size={16} className="text-emerald-500" />}
                          </div>
                        </div>
                      </div>
                    ))}
                    {participant.progress.length > 5 && (
                      <div className="text-xs text-theme-secondary text-center py-1">
                        +{participant.progress.length - 5} mais aulas
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full text-center text-theme-secondary py-12 border border-dashed border-theme rounded-2xl">
              Nenhum participante encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
