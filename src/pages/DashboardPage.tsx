import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Topic, Content, Lesson } from '../lib/db';
import {
  createTopic,
  createContent,
  createLesson,
  deleteContent,
  deleteLesson,
  deleteTopic,
  listenTopics,
  listenContentsByTopic,
  listenLessonsByContent,
  updateContent,
  updateLesson,
  updateTopic,
  reorderTopics,
  reorderContents,
  reorderLessons,
} from '../lib/db';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GripVertical, ChevronDown, ChevronRight, Pencil, Trash2, Plus } from 'lucide-react';

export function DashboardPage() {
  const { signOutUser, user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'topics' | 'detail'>('topics');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // Topics
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');

  // Contents (for selected topic)
  const [contents, setContents] = useState<Content[]>([]);
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentDesc, setNewContentDesc] = useState('');
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editingContentTitle, setEditingContentTitle] = useState('');
  const [editingContentDesc, setEditingContentDesc] = useState('');

  // Lessons (for expanded content)
  const [expandedContentId, setExpandedContentId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonUrl, setNewLessonUrl] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');
  const [editingLessonUrl, setEditingLessonUrl] = useState('');

  // Live data
  useEffect(() => {
    const unsub = listenTopics(setTopics);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedTopic) { setContents([]); return; }
    const unsub = listenContentsByTopic(selectedTopic.id, setContents);
    return () => unsub();
  }, [selectedTopic]);

  useEffect(() => {
    if (!expandedContentId) { setLessons([]); return; }
    const unsub = listenLessonsByContent(expandedContentId, setLessons);
    return () => unsub();
  }, [expandedContentId]);

  const selectedTopicName = selectedTopic?.name || '';
  const expandedContentTitle = useMemo(() => contents.find(c => c.id === expandedContentId)?.title || '', [contents, expandedContentId]);

  const handleLogout = async () => {
    await signOutUser();
    navigate('/auth');
  };

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (source.droppableId === 'topics' && destination.droppableId === 'topics') {
      const next = Array.from(topics);
      const [m] = next.splice(source.index, 1);
      next.splice(destination.index, 0, m);
      setTopics(next);
      reorderTopics(next.map(t => t.id));
    }
    if (source.droppableId === 'contents' && destination.droppableId === 'contents') {
      const next = Array.from(contents);
      const [m] = next.splice(source.index, 1);
      next.splice(destination.index, 0, m);
      setContents(next);
      reorderContents(next.map(c => c.id));
    }
    if (source.droppableId.startsWith('lessons-') && destination.droppableId.startsWith('lessons-')) {
      const next = Array.from(lessons);
      const [m] = next.splice(source.index, 1);
      next.splice(destination.index, 0, m);
      setLessons(next);
      reorderLessons(next.map(l => l.id));
    }
  }

  return (
    <div className="min-h-[100svh] bg-theme-base p-6 text-theme-primary">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Gerenciador de Conteúdo</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/cursos')} className="px-3 py-2 rounded-xl text-sm border border-theme text-theme-secondary hover:bg-theme-surface-hover">Ver página pública</button>
            <button onClick={() => navigate('/')} className="px-3 py-2 rounded-xl text-sm border border-theme text-theme-secondary hover:bg-theme-surface-hover">Ir para o site</button>
            <span className="text-sm text-theme-secondary">{user?.email}</span>
            <button onClick={handleLogout} className="px-3 py-2 rounded-xl text-sm btn-primary">Sair</button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          {mode === 'topics' && (
            <section className="bg-theme-surface rounded-2xl border border-theme p-0 shadow overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
                <h2 className="font-medium truncate">Tópicos</h2>
                <form className="flex gap-2" onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newTopicName.trim()) return;
                  await createTopic(newTopicName.trim(), topics.length);
                  setNewTopicName('');
                }}>
                  <input placeholder="Novo tópico" className="w-56 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} />
                  <button className="px-3 py-2 rounded-xl btn-primary flex items-center gap-2"><Plus size={16}/> Adicionar</button>
                </form>
              </div>

              <Droppable droppableId="topics">
                {(provided) => (
                  <ul ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-theme">
                    {topics.map((t, index) => (
                      <Draggable key={t.id} draggableId={t.id} index={index} isDragDisabled={editingTopicId === t.id}>
                        {(drag) => (
                          <li ref={drag.innerRef} {...drag.draggableProps} className="bg-theme-base px-3 py-2 flex items-center gap-3">
                            <span {...drag.dragHandleProps} className="text-theme-secondary cursor-grab active:cursor-grabbing select-none"><GripVertical size={18}/></span>
                            {editingTopicId === t.id ? (
                              <input autoFocus className="flex-1 px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={editingTopicName} onChange={(e) => setEditingTopicName(e.target.value)} />
                            ) : (
                              <div className="flex-1 font-medium truncate">{t.name}</div>
                            )}
                            {editingTopicId === t.id ? (
                              <>
                                <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => setEditingTopicId(null)}>Cancelar</button>
                                <button className="px-3 py-2 rounded-xl btn-primary" onClick={async () => { await updateTopic(t.id, { name: editingTopicName }); setEditingTopicId(null); }}>Salvar</button>
                              </>
                            ) : (
                              <>
                                <button className="px-3 py-2 rounded-xl border border-theme flex items-center gap-2" onClick={() => { setEditingTopicId(t.id); setEditingTopicName(t.name); }}><Pencil size={16}/> Renomear</button>
                                <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => { setSelectedTopic(t); setMode('detail'); setExpandedContentId(null); }}>Gerenciar</button>
                                <button className="px-3 py-2 rounded-xl border border-theme text-red-500 flex items-center gap-2" onClick={async () => { if (confirm('Excluir este tópico?')) await deleteTopic(t.id); }}><Trash2 size={16}/> Excluir</button>
                              </>
                            )}
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </section>
          )}

          {mode === 'detail' && selectedTopic && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setMode('topics'); setSelectedTopic(null); }} className="px-3 py-2 rounded-xl border border-theme hover:bg-theme-surface-hover">Voltar</button>
                  <h2 className="font-medium truncate">{selectedTopicName}</h2>
                </div>
                <div className="text-sm text-theme-secondary">Conteúdos</div>
              </div>

              <div className="bg-theme-surface rounded-2xl border border-theme p-4 shadow space-y-3">
                <form className="flex flex-col sm:flex-row gap-2" onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newContentTitle.trim()) return;
                  const desc = newContentDesc.trim();
                  await createContent({ topicId: selectedTopic.id, title: newContentTitle.trim(), ...(desc ? { description: desc } : {}), order: contents.length } as any);
                  setNewContentTitle(''); setNewContentDesc('');
                }}>
                  <input placeholder="Título do conteúdo" className="flex-1 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newContentTitle} onChange={(e) => setNewContentTitle(e.target.value)} />
                  <input placeholder="Descrição (opcional)" className="flex-1 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newContentDesc} onChange={(e) => setNewContentDesc(e.target.value)} />
                  <button className="px-3 py-2 rounded-xl btn-primary">Adicionar</button>
                </form>

                <Droppable droppableId="contents">
                  {(provided) => (
                    <ul ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-theme">
                      {contents.map((c, index) => (
                        <Draggable key={c.id} draggableId={c.id} index={index} isDragDisabled={editingContentId === c.id}>
                          {(drag) => (
                            <li ref={drag.innerRef} {...drag.draggableProps} className="bg-theme-base px-3 py-2 flex items-center gap-3">
                              <span {...drag.dragHandleProps} className="text-theme-secondary cursor-grab active:cursor-grabbing select-none"><GripVertical size={18}/></span>
                              {editingContentId === c.id ? (
                                <div className="flex-1 flex gap-2">
                                  <input className="w-full px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={editingContentTitle} onChange={(e) => setEditingContentTitle(e.target.value)} />
                                  <input className="w-full px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={editingContentDesc} onChange={(e) => setEditingContentDesc(e.target.value)} />
                                </div>
                              ) : (
                                <div>
                                  <div className="font-medium truncate">{c.title}</div>
                                  {c.description && <div className="text-sm text-theme-secondary">{c.description}</div>}
                                </div>
                              )}
                              <div className="flex gap-2 ml-auto">
                                {editingContentId === c.id ? (
                                  <>
                                    <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => setEditingContentId(null)}>Cancelar</button>
                                    <button className="px-3 py-2 rounded-xl btn-primary" onClick={async () => { await updateContent(c.id, { title: editingContentTitle, description: editingContentDesc }); setEditingContentId(null); }}>Salvar</button>
                                  </>
                                ) : (
                                  <>
                                    <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => { setEditingContentId(c.id); setEditingContentTitle(c.title); setEditingContentDesc(c.description || ''); }}>Editar</button>
                                    <button className="px-3 py-2 rounded-xl border border-theme flex items-center gap-2" onClick={() => setExpandedContentId(expandedContentId === c.id ? null : c.id)}>
                                      {expandedContentId === c.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>} Aulas
                                    </button>
                                    <button className="px-3 py-2 rounded-xl border border-theme text-red-500" onClick={async () => { if (confirm('Excluir este conteúdo?')) await deleteContent(c.id); }}>Excluir</button>
                                  </>
                                )}
                              </div>

                              {expandedContentId === c.id && (
                                <div className="mt-2 space-y-2">
                                  <div className="text-sm text-theme-secondary">Aulas de "{c.title}"</div>
                                  <form className="flex flex-col sm:flex-row gap-2" onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!newLessonTitle.trim() || !newLessonUrl.trim()) return;
                                    await createLesson({ contentId: c.id, title: newLessonTitle.trim(), youtubeUrl: newLessonUrl.trim(), order: lessons.length });
                                    setNewLessonTitle(''); setNewLessonUrl('');
                                  }}>
                                    <input placeholder="Título da aula" className="flex-1 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} />
                                    <input placeholder="Link do YouTube" className="flex-1 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newLessonUrl} onChange={(e) => setNewLessonUrl(e.target.value)} />
                                    <button className="px-3 py-2 rounded-xl btn-primary">Adicionar</button>
                                  </form>
                                  <Droppable droppableId={`lessons-${c.id}`}>
                                    {(p2) => (
                                      <ul ref={p2.innerRef} {...p2.droppableProps} className="divide-y divide-theme">
                                        {lessons.map((l, idx) => (
                                          <Draggable key={l.id} draggableId={l.id} index={idx} isDragDisabled={editingLessonId === l.id}>
                                            {(drag2) => (
                                              <li ref={drag2.innerRef} {...drag2.draggableProps} {...drag2.dragHandleProps} className="bg-theme-base px-3 py-2 flex items-center gap-3">
                                                {editingLessonId === l.id ? (
                                                  <div className="flex-1 flex gap-2">
                                                    <input className="w-full px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={editingLessonTitle} onChange={(e) => setEditingLessonTitle(e.target.value)} />
                                                    <input className="w-full px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={editingLessonUrl} onChange={(e) => setEditingLessonUrl(e.target.value)} />
                                                    <div className="flex gap-2">
                                                      <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => setEditingLessonId(null)}>Cancelar</button>
                                                      <button className="px-3 py-2 rounded-xl btn-primary" onClick={async () => { await updateLesson(l.id, { title: editingLessonTitle, youtubeUrl: editingLessonUrl }); setEditingLessonId(null); }}>Salvar</button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div>
                                                      <div className="font-medium truncate">{l.title}</div>
                                                      <div className="text-sm text-theme-secondary truncate max-w-[40ch]">{l.youtubeUrl}</div>
                                                    </div>
                                                    <div className="flex gap-2 ml-auto">
                                                      <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => { setEditingLessonId(l.id); setEditingLessonTitle(l.title); setEditingLessonUrl(l.youtubeUrl); }}>Editar</button>
                                                      <button className="px-3 py-2 rounded-xl border border-theme text-red-500" onClick={async () => { if (confirm('Excluir esta aula?')) await deleteLesson(l.id); }}>Excluir</button>
                                                    </div>
                                                  </div>
                                                )}
                                              </li>
                                            )}
                                          </Draggable>
                                        ))}
                                        {p2.placeholder}
                                      </ul>
                                    )}
                                  </Droppable>
                                </div>
                              )}
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </div>
            </section>
          )}
        </DragDropContext>
      </div>
    </div>
  );
}




