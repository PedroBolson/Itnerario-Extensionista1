import { useEffect, useMemo, useState } from 'react';
import type { Topic, Content, Lesson } from '../lib/db';
import { listAllTopics, listContentsByTopic, listLessonsByContent } from '../lib/db';
import { YouTubePlayer } from '../components/YouTubePlayer';

export function CoursesPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedContentId, setSelectedContentId] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState('');

  useEffect(() => {
    listAllTopics().then(setTopics);
  }, []);

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

  return (
    <div className="min-h-[100svh] bg-theme-base text-theme-primary">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Mini Cursos</h1>
          <p className="text-theme-secondary">Explore tópicos, conteúdos e assista aulas incorporadas do YouTube.</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3">
          <select className="w-full sm:w-1/3 px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)}>
            <option value="">Selecione um tópico</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select className="w-full sm:w-1/3 px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={selectedContentId} onChange={(e) => setSelectedContentId(e.target.value)} disabled={!selectedTopicId}>
            <option value="">Selecione um conteúdo</option>
            {contents.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="text-sm text-theme-secondary">{selectedTopicName || '—'} {selectedContentTitle ? `› ${selectedContentTitle}` : ''}</div>
            {activeLesson ? (
              <YouTubePlayer url={activeLesson.youtubeUrl} title={activeLesson.title} />
            ) : (
              <div className="aspect-video w-full rounded-xl border border-theme bg-theme-base grid place-items-center text-theme-muted">Selecione uma aula</div>
            )}
            {activeLesson && (
              <div className="p-3 rounded-xl border border-theme bg-theme-surface">
                <h2 className="font-medium">{activeLesson.title}</h2>
                <div className="text-sm text-theme-secondary truncate">{activeLesson.youtubeUrl}</div>
              </div>
            )}
          </div>
          <aside className="space-y-2">
            <h3 className="font-medium">Aulas</h3>
            {lessons.length === 0 && <div className="text-sm text-theme-secondary">Nenhuma aula</div>}
            <ul className="space-y-1">
              {lessons.map((l, idx) => (
                <li key={l.id}>
                  <button
                    onClick={() => setActiveLessonId(l.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl border ${l.id === activeLessonId ? 'btn-primary' : 'border-theme bg-theme-surface text-theme-primary hover:bg-theme-surface-hover'}`}
                  >
                    <div className="text-sm font-medium">{idx + 1}. {l.title}</div>
                    <div className="text-xs opacity-80 truncate">{l.youtubeUrl}</div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
