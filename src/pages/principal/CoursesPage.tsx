import { useEffect, useMemo, useState } from 'react';
import type { Topic, Content, Lesson } from '../../lib/db';
import { listAllTopics, listContentsByTopic, listLessonsByContent } from '../../lib/db';
import { YouTubePlayer } from '../../components/YouTubePlayer';
import { CourseImage } from '../../components/CourseImage';
import { CategoryIcon } from '../../components/CategoryIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { getCategoryInfo, getDifficultyInfo, generateColorFromString } from '../../lib/courseUtils';
import { Home, Search, Clock, ChevronRight, BookOpen, CheckCircle2, User, LogOut } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { LearnerAccess } from '../../components/LearnerAccess';

export function CoursesPage() {
  const { learner, progress, setLearner } = useLearner();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedContentId, setSelectedContentId] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [contentQuery, setContentQuery] = useState('');
  const [showLearnerAccess, setShowLearnerAccess] = useState(false);

  useEffect(() => { listAllTopics().then(setTopics); }, []);

  useEffect(() => {
    if (!selectedTopicId) { setContents([]); setSelectedContentId(''); setLessons([]); setActiveLessonId(''); return; }
    listContentsByTopic(selectedTopicId).then(setContents);
  }, [selectedTopicId]);

  useEffect(() => {
    if (!selectedContentId) { setLessons([]); setActiveLessonId(''); return; }
    listLessonsByContent(selectedContentId).then((l) => { setLessons(l); if (l[0]) setActiveLessonId(l[0].id); });
  }, [selectedContentId]);

  const activeLesson = useMemo(() => lessons.find(l => l.id === activeLessonId) || null, [lessons, activeLessonId]);
  const selectedTopicName = useMemo(() => topics.find(t => t.id === selectedTopicId)?.name || '', [topics, selectedTopicId]);
  const selectedContentTitle = useMemo(() => contents.find(c => c.id === selectedContentId)?.title || '', [contents, selectedContentId]);
  const activeLessonDescription = activeLesson?.description?.trim();
  const filteredTopics = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(t => t.name.toLowerCase().includes(q));
  }, [topics, topicQuery]);
  const filteredContents = useMemo(() => {
    const q = contentQuery.trim().toLowerCase();
    if (!q) return contents;
    return contents.filter(c => [c.title, c.description || ''].some(v => v.toLowerCase().includes(q)));
  }, [contents, contentQuery]);

  const progressByLesson = useMemo(() => {
    const map: Record<string, typeof progress[number]> = {};
    progress.forEach((entry) => {
      map[entry.lessonId] = entry;
    });
    return map;
  }, [progress]);

  const completedLessonsCount = useMemo(() => {
    return lessons.reduce((acc, lesson) => acc + (progressByLesson[lesson.id]?.completed ? 1 : 0), 0);
  }, [lessons, progressByLesson]);

  const totalWatchSeconds = useMemo(() => {
    return lessons.reduce((acc, lesson) => acc + (progressByLesson[lesson.id]?.lastPosition ?? 0), 0);
  }, [lessons, progressByLesson]);

  const formattedWatchTime = useMemo(() => {
    if (totalWatchSeconds <= 0) return '0 min';
    const hours = Math.floor(totalWatchSeconds / 3600);
    const minutes = Math.round((totalWatchSeconds % 3600) / 60);
    if (hours === 0) {
      return `${Math.max(minutes, 1)} min`;
    }
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }, [totalWatchSeconds]);

  const stage: 'topics' | 'contents' | 'lessons' = !selectedTopicId ? 'topics' : !selectedContentId ? 'contents' : 'lessons';

  return (
    <div className="min-h-[100svh] bg-theme-base text-theme-primary">
      <div className="max-w-[1200px] xl:max-w-[1400px] mx-auto px-6 pt-24 pb-10 space-y-6">
        <header className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Mini Cursos</h1>
            <p className="text-theme-secondary">Explore tópicos, conteúdos e assista aulas incorporadas do YouTube.</p>
          </div>

          {learner ? (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-green-100 border border-green-300 text-green-700 rounded-xl flex items-center gap-3">
                <User size={16} />
                <div className="leading-tight">
                  <div className="font-medium">{learner.displayName}</div>
                  <div className="text-[11px] uppercase tracking-wide opacity-75">{learner.id}</div>
                </div>
              </div>
              <button
                onClick={() => { setLearner(null); setShowLearnerAccess(true); }}
                className="px-3 py-2 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLearnerAccess(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <User size={16} />
              Acessar Progresso
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          {stage === 'topics' && (
            <motion.section key="topics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Escolha um tópico</h2>
                  <p className="text-sm text-theme-secondary">Explore diferentes áreas de conhecimento</p>
                </div>
                <input
                  placeholder="Buscar tópicos..."
                  className="px-4 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={topicQuery}
                  onChange={(e) => setTopicQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredTopics.map((t) => {
                  const categoryInfo = getCategoryInfo(t.category);
                  const fallbackColor = t.color || generateColorFromString(t.name);

                  return (
                    <motion.button
                      key={t.id}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`group relative overflow-hidden rounded-2xl border bg-theme-surface text-left transition-all duration-300 ${selectedTopicId === t.id
                        ? 'ring-2 ring-blue-500 border-blue-500'
                        : 'border-theme hover:border-gray-300 hover:shadow-lg'
                        }`}
                      onClick={() => { setSelectedTopicId(t.id); setTopicQuery(''); }}
                    >
                      <div className="relative">
                        <CourseImage
                          src={t.coverImageUrl}
                          alt={t.name}
                          fallbackColor={fallbackColor}
                          fallbackIcon={categoryInfo.icon}
                          aspectRatio="video"
                          className="group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Overlay com gradiente */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-xl" />

                        {/* Badge de categoria */}
                        <div
                          className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1"
                          style={{ backgroundColor: categoryInfo.color + '90' }}
                        >
                          <CategoryIcon Icon={categoryInfo.icon} size={12} />
                          <span>{categoryInfo.name}</span>
                        </div>

                        {/* Título sobreposto */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="font-semibold text-white text-lg leading-tight">{t.name}</h3>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
                {filteredTopics.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Search size={64} className="mx-auto mb-4 text-theme-secondary opacity-50" />
                    <div className="text-lg font-medium text-theme-secondary">Nenhum tópico encontrado</div>
                    <div className="text-sm text-theme-secondary">Tente buscar com outros termos</div>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {stage === 'contents' && (
            <motion.section key="contents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <nav className="flex items-center gap-2 mb-2 text-sm">
                    <button
                      className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      onClick={() => { setSelectedTopicId(''); setSelectedContentId(''); setLessons([]); }}
                    >
                      <Home size={14} />
                      <span>Tópicos</span>
                    </button>
                    <ChevronRight size={14} className="text-theme-secondary" />
                    <span className="text-theme-primary font-medium">{selectedTopicName}</span>
                  </nav>
                  <h2 className="text-xl font-semibold">Cursos disponíveis</h2>
                  <p className="text-sm text-theme-secondary">Escolha um curso para começar sua jornada de aprendizado</p>
                </div>
                <input
                  placeholder="Buscar cursos..."
                  className="px-4 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={contentQuery}
                  onChange={(e) => setContentQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredContents.map((c) => {
                  const difficultyInfo = getDifficultyInfo(c.difficulty);

                  return (
                    <motion.button
                      key={c.id}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`group relative overflow-hidden rounded-2xl border bg-theme-surface text-left transition-all duration-300 ${selectedContentId === c.id
                        ? 'ring-2 ring-blue-500 border-blue-500'
                        : 'border-theme hover:border-gray-300 hover:shadow-lg'
                        }`}
                      onClick={() => { setSelectedContentId(c.id); }}
                    >
                      <div className="relative">
                        <CourseImage
                          src={c.coverImageUrl}
                          alt={c.title}
                          fallbackColor={generateColorFromString(c.title)}
                          fallbackIcon={difficultyInfo.icon}
                          aspectRatio="video"
                          className="group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Overlay com gradiente */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-xl" />

                        {/* Badge de dificuldade */}
                        <div
                          className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1"
                          style={{ backgroundColor: difficultyInfo.color + '90' }}
                        >
                          <CategoryIcon Icon={difficultyInfo.icon} size={12} />
                          <span>{difficultyInfo.name}</span>
                        </div>

                        {/* Duração (se disponível) */}

                      </div>

                      {/* Informações do curso */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-base leading-tight line-clamp-2">{c.title}</h3>
                        {c.description && (
                          <p className="text-sm text-theme-secondary line-clamp-3">{c.description}</p>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
                {filteredContents.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <BookOpen size={64} className="mx-auto mb-4 text-theme-secondary opacity-50" />
                    <div className="text-lg font-medium text-theme-secondary">Nenhum curso encontrado</div>
                    <div className="text-sm text-theme-secondary">Tente buscar com outros termos</div>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {stage === 'lessons' && (
            <motion.section key="lessons" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="space-y-3">
                <nav className="flex items-center gap-2 text-sm">
                  <button
                    className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    onClick={() => { setSelectedTopicId(''); setSelectedContentId(''); setActiveLessonId(''); }}
                  >
                    <Home size={14} />
                    <span>Tópicos</span>
                  </button>
                  <ChevronRight size={14} className="text-theme-secondary" />
                  <button
                    className="text-blue-500 hover:text-blue-600"
                    onClick={() => { setSelectedContentId(''); setActiveLessonId(''); }}
                  >
                    {selectedTopicName}
                  </button>
                  <ChevronRight size={14} className="text-theme-secondary" />
                  <span className="text-theme-primary font-medium">{selectedContentTitle}</span>
                </nav>

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Aulas do curso</h2>
                  <div className="flex items-center gap-4 text-sm text-theme-secondary">
                    <div className="flex items-center gap-2">
                      <CategoryIcon Icon={BookOpen} size={14} />
                      <span>{lessons.length} aulas</span>
                    </div>
                    {learner && (
                      <>
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                          <CheckCircle2 size={14} />
                          <span>{completedLessonsCount} de {lessons.length} concluídas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          <span>{formattedWatchTime} assistidos</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 space-y-3">
                  <div className="rounded-2xl border border-theme p-1 bg-theme-surface">
                    {activeLesson ? (
                      <YouTubePlayer
                        url={activeLesson.youtubeUrl}
                        title={activeLesson.title}
                        lessonId={activeLessonId}
                        contentId={selectedContentId}
                        topicId={selectedTopicId}
                        contentTitle={selectedContentTitle}
                        topicTitle={selectedTopicName}
                      />
                    ) : (
                      <div className="aspect-video w-full rounded-xl bg-theme-base grid place-items-center text-theme-muted">Selecione uma aula</div>
                    )}
                  </div>
                  {activeLessonDescription && (
                    <div className="px-4 py-3 rounded-xl bg-theme-surface text-sm leading-relaxed text-theme-secondary">
                      {activeLessonDescription}
                    </div>
                  )}
                </div>
                <aside className="space-y-2">
                  <div className="rounded-2xl border border-theme bg-theme-surface p-3">
                    <h3 className="font-medium mb-2">Aulas</h3>
                    {lessons.length === 0 && <div className="text-sm text-theme-secondary">Nenhuma aula</div>}
                    <ul className="space-y-2">
                      {lessons.map((l, idx) => {
                        const lessonProgressData = progressByLesson[l.id];
                        const isCompleted = lessonProgressData?.completed || false;
                        const progressPercent = lessonProgressData && lessonProgressData.duration > 0 ?
                          Math.round((lessonProgressData.lastPosition / lessonProgressData.duration) * 100) : 0;

                        return (
                          <li key={l.id}>
                            <button onClick={() => setActiveLessonId(l.id)} className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${l.id === activeLessonId ? 'btn-primary' : 'border-theme bg-theme-surface text-theme-primary hover:bg-theme-surface-hover'}`}>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full border ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                                  l.id === activeLessonId ? 'border-white/50' : 'border-theme'
                                  }`}>
                                  {isCompleted ? <CheckCircle2 size={12} /> : idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium truncate">{l.title}</div>
                                  <div className="text-xs opacity-80 truncate">
                                    {lessonProgressData ? `${progressPercent}% assistido` : 'Pronto para começar'}
                                  </div>
                                </div>
                              </div>
                              {lessonProgressData && progressPercent > 0 && (
                                <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                                  <div
                                    className={`h-1 rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </aside>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <LearnerAccess
        isOpen={showLearnerAccess}
        onClose={() => setShowLearnerAccess(false)}
      />
    </div>
  );
}
