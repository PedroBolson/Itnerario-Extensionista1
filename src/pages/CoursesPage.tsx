import { useEffect, useMemo, useState } from 'react';
import type { Topic, Content, Lesson } from '../lib/db';
import { listAllTopics, listContentsByTopic, listLessonsByContent } from '../lib/db';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { motion, AnimatePresence } from 'framer-motion';

export function CoursesPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedContentId, setSelectedContentId] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [contentQuery, setContentQuery] = useState('');

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

  const stage: 'topics' | 'contents' | 'lessons' = !selectedTopicId ? 'topics' : !selectedContentId ? 'contents' : 'lessons';

  return (
    <div className="min-h-[100svh] bg-theme-base text-theme-primary">
      <div className="max-w-[1200px] xl:max-w-[1400px] mx-auto px-6 pt-24 pb-10 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Mini Cursos</h1>
          <p className="text-theme-secondary">Explore tópicos, conteúdos e assista aulas incorporadas do YouTube.</p>
        </header>

        <AnimatePresence mode="wait">
          {stage === 'topics' && (
            <motion.section key="topics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-theme-secondary">Escolha um tópico</div>
                <input placeholder="Buscar tópicos" className="px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary w-64" value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredTopics.map((t) => (
                  <motion.button key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`px-3 py-3 rounded-xl border text-left ${selectedTopicId === t.id ? 'is-active' : 'border-theme bg-theme-surface hover:bg-theme-surface-hover'}`} onClick={() => { setSelectedTopicId(t.id); setTopicQuery(''); }}>
                    <div className="font-medium truncate">{t.name}</div>
                  </motion.button>
                ))}
                {filteredTopics.length === 0 && <div className="text-sm text-theme-secondary">Nenhum tópico encontrado</div>}
              </div>
            </motion.section>
          )}

          {stage === 'contents' && (
            <motion.section key="contents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-theme-secondary">{selectedTopicName}</div>
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => { setSelectedTopicId(''); setSelectedContentId(''); setLessons([]); }}>Trocar tópico</button>
                  <input placeholder="Buscar conteúdos" className="px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary w-64" value={contentQuery} onChange={(e) => setContentQuery(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredContents.map((c) => (
                  <motion.button key={c.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`px-3 py-3 rounded-xl border text-left ${selectedContentId === c.id ? 'is-active' : 'border-theme bg-theme-surface hover:bg-theme-surface-hover'}`} onClick={() => { setSelectedContentId(c.id); }}>
                    <div className="font-medium truncate">{c.title}</div>
                    {c.description && <div className="text-xs text-theme-secondary truncate">{c.description}</div>}
                  </motion.button>
                ))}
                {filteredContents.length === 0 && <div className="text-sm text-theme-secondary">Nenhum conteúdo</div>}
              </div>
            </motion.section>
          )}

          {stage === 'lessons' && (
            <motion.section key="lessons" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-theme-secondary">{selectedTopicName} › {selectedContentTitle}</div>
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => { setSelectedContentId(''); setActiveLessonId(''); }}>Trocar conteúdo</button>
                  <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => { setSelectedTopicId(''); setSelectedContentId(''); setActiveLessonId(''); }}>Trocar tópico</button>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 space-y-3">
                  <div className="rounded-2xl border border-theme p-1 bg-theme-surface">
                    {activeLesson ? (
                      <YouTubePlayer url={activeLesson.youtubeUrl} title={activeLesson.title} />
                    ) : (
                      <div className="aspect-video w-full rounded-xl bg-theme-base grid place-items-center text-theme-muted">Selecione uma aula</div>
                    )}
                  </div>
                  {activeLesson && (
                    <div className="p-3 rounded-xl border border-theme bg-theme-surface">
                      <h2 className="font-medium">{activeLesson.title}</h2>
                      <div className="text-sm text-theme-secondary truncate">{activeLesson.youtubeUrl}</div>
                    </div>
                  )}
                </div>
                <aside className="space-y-2">
                  <div className="rounded-2xl border border-theme bg-theme-surface p-3">
                    <h3 className="font-medium mb-2">Aulas</h3>
                    {lessons.length === 0 && <div className="text-sm text-theme-secondary">Nenhuma aula</div>}
                    <ul className="space-y-2">
                      {lessons.map((l, idx) => (
                        <li key={l.id}>
                          <button onClick={() => setActiveLessonId(l.id)} className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${l.id === activeLessonId ? 'btn-primary' : 'border-theme bg-theme-surface text-theme-primary hover:bg-theme-surface-hover'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full border ${l.id === activeLessonId ? 'border-white/50' : 'border-theme'}`}>{idx + 1}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{l.title}</div>
                                <div className="text-xs opacity-80 truncate">{l.youtubeUrl}</div>
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

