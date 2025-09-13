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
import { GripVertical, ChevronRight, Pencil, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardPage() {
  const { signOutUser, user } = useAuth();
  const navigate = useNavigate();

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicQuery, setTopicQuery] = useState('');

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

  // Lessons (for selected content)
  const [expandedContentId, setExpandedContentId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonUrl, setNewLessonUrl] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');
  const [editingLessonUrl, setEditingLessonUrl] = useState('');
  const [addingLessonForId, setAddingLessonForId] = useState<string | null>(null);

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

  useEffect(() => {
    setAddingLessonForId(null);
  }, [expandedContentId]);

  const selectedTopicName = selectedTopic?.name || '';
  const expandedContentTitle = useMemo(() => contents.find(c => c.id === expandedContentId)?.title || '', [contents, expandedContentId]);
  const filteredTopics = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(t => t.name.toLowerCase().includes(q));
  }, [topics, topicQuery]);
  const [contentQuery, setContentQuery] = useState('');
  const filteredContents = useMemo(() => {
    const q = contentQuery.trim().toLowerCase();
    if (!q) return contents;
    return contents.filter(c => [c.title, c.description || ''].some(v => v.toLowerCase().includes(q)));
  }, [contents, contentQuery]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      navigate('/admin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }; function handleDragEnd(result: DropResult) {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'TOPICS') {
      const next = Array.from(topics);
      const [m] = next.splice(source.index, 1);
      next.splice(destination.index, 0, m);
      setTopics(next);
      reorderTopics(next.map(t => t.id));
    }
    if (type === 'CONTENTS') {
      const next = Array.from(contents);
      const [m] = next.splice(source.index, 1);
      next.splice(destination.index, 0, m);
      setContents(next);
      reorderContents(next.map(c => c.id));
    }
    if (type === 'LESSONS') {
      const next = Array.from(lessons);
      const [m] = next.splice(source.index, 1);
      next.splice(destination.index, 0, m);
      setLessons(next);
      reorderLessons(next.map(l => l.id));
    }
  }

  const showContents = !!selectedTopic;
  const showLessons = !!expandedContentId;
  const topicsActive = !showContents; // foco está em tópicos
  const contentsActive = showContents && !showLessons; // foco em conteúdos

  return (
    <div className="min-h-screen bg-transparent text-theme-primary p-6">
      <div className="w-full max-w-none mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Gerenciador de Conteúdo</h1>
          <div className="flex items-center gap-3 mr-24">
            <button onClick={() => navigate('/cursos')} className="px-3 py-2 rounded-xl text-sm border border-theme text-theme-secondary hover:bg-theme-surface-hover">Ver página pública</button>
            <button onClick={() => navigate('/')} className="px-3 py-2 rounded-xl text-sm border border-theme text-theme-secondary hover:bg-theme-surface-hover">Ir para o site</button>
            <span className="text-sm text-theme-secondary">{user?.email}</span>
            <button onClick={handleLogout} className="px-3 py-2 rounded-xl text-sm btn-primary">Sair</button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <section className="flex items-stretch gap-3 transition-all">
            {/* Topics Pane */}
            <motion.div
              className="bg-transparent rounded-2xl border border-theme overflow-hidden"
              initial={{ width: '100%' }}
              animate={{ width: showContents ? (showLessons ? '20%' : '35%') : '100%' }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-theme gap-2">
                <h2 className="font-medium truncate">Tópicos</h2>
                {topicsActive && (
                  <div className="flex items-center gap-2">
                    <input
                      placeholder="Buscar"
                      className="w-40 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary"
                      value={topicQuery}
                      onChange={(e) => setTopicQuery(e.target.value)}
                    />
                    <form className="flex items-center gap-2" onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newTopicName.trim()) return;
                      await createTopic(newTopicName.trim(), topics.length);
                      setNewTopicName('');
                    }}>
                      <input placeholder="Novo tópico" className="w-48 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} />
                      <button className="px-3 py-2 rounded-xl btn-primary flex items-center gap-2"><Plus size={16} /> Adicionar</button>
                    </form>
                  </div>
                )}
              </div>

              <Droppable droppableId="topics" type="TOPICS">
                {(provided) => (
                  <ul ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 p-2">
                    {filteredTopics.map((t, index) => (
                      <Draggable key={t.id} draggableId={t.id} index={index} isDragDisabled={editingTopicId === t.id}>
                        {(drag) => (
                          <li ref={drag.innerRef} {...drag.draggableProps} className={`px-3 py-2 flex items-center gap-3 bg-transparent rounded-xl border border-theme hover:bg-theme-surface-hover/30 ${selectedTopic?.id === t.id ? 'is-active' : ''}`}>
                            <span {...drag.dragHandleProps} className="text-theme-secondary cursor-grab active:cursor-grabbing select-none"><GripVertical size={18} /></span>
                            {editingTopicId === t.id ? (
                              <input autoFocus className="flex-1 px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={editingTopicName} onChange={(e) => setEditingTopicName(e.target.value)} />
                            ) : (
                              <button className="flex-1 text-left font-medium truncate hover:underline" onClick={() => { setSelectedTopic(t); setExpandedContentId(null); }}>
                                {t.name}
                              </button>
                            )}
                            {editingTopicId === t.id ? (
                              <>
                                <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => setEditingTopicId(null)}>Cancelar</button>
                                <button className="px-3 py-2 rounded-xl btn-primary" onClick={async () => { await updateTopic(t.id, { name: editingTopicName }); setEditingTopicId(null); }}>Salvar</button>
                              </>
                            ) : topicsActive ? (
                              <>
                                <button className="px-3 py-2 rounded-xl border border-theme flex items-center gap-2" onClick={() => { setEditingTopicId(t.id); setEditingTopicName(t.name); }}><Pencil size={16} /> Renomear</button>
                                <button className="px-3 py-2 rounded-xl border border-theme text-red-500 flex items-center gap-2" onClick={async () => { if (confirm('Excluir este tópico?')) await deleteTopic(t.id); }}><Trash2 size={16} /> Excluir</button>
                              </>
                            ) : null}
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </motion.div>

            {showContents && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-6 grid place-items-center text-theme-secondary">
                <ChevronRight />
              </motion.div>
            )}

            {/* Contents Pane */}
            <motion.div
              className="bg-transparent rounded-2xl border border-theme overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: showContents ? (showLessons ? '28%' : '65%') : 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              {showContents && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelectedTopic(null); setExpandedContentId(null); }} className="px-3 py-2 rounded-xl btn-soft flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
                      <h2 className="font-medium truncate">{selectedTopicName}</h2>
                    </div>
                    <div className="text-sm text-theme-secondary">Conteúdos</div>
                  </div>

                  <div className="p-4 space-y-3">
                    {contentsActive && (
                      <form className="flex flex-col sm:flex-row gap-2" onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newContentTitle.trim()) return;
                        const desc = newContentDesc.trim();
                        await createContent({ topicId: selectedTopic!.id, title: newContentTitle.trim(), ...(desc ? { description: desc } : {}), order: contents.length } as any);
                        setNewContentTitle(''); setNewContentDesc('');
                      }}>
                        <input placeholder="Título do conteúdo" className="flex-1 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newContentTitle} onChange={(e) => setNewContentTitle(e.target.value)} />
                        <input placeholder="Descrição (opcional)" className="flex-1 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newContentDesc} onChange={(e) => setNewContentDesc(e.target.value)} />
                        <button className="px-3 py-2 rounded-xl btn-primary">Adicionar</button>
                      </form>
                    )}

                    {/* Busca em conteúdos */}
                    {contentsActive && (
                      <input
                        placeholder="Buscar conteúdos"
                        className="w-full px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary"
                        value={contentQuery}
                        onChange={(e) => setContentQuery(e.target.value)}
                      />
                    )}

                    <Droppable droppableId="contents" type="CONTENTS">
                      {(provided) => (
                        <ul ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 p-2">
                          {filteredContents.map((c, index) => (
                            <Draggable key={c.id} draggableId={c.id} index={index} isDragDisabled={editingContentId === c.id}>
                              {(drag) => (
                                <li ref={drag.innerRef} {...drag.draggableProps} className={`px-3 py-2 flex items-center gap-3 bg-transparent rounded-xl border border-theme hover:bg-theme-surface-hover/30 ${expandedContentId === c.id ? 'is-active' : ''}`}>
                                  <span {...drag.dragHandleProps} className="text-theme-secondary cursor-grab active:cursor-grabbing select-none"><GripVertical size={18} /></span>
                                  {editingContentId === c.id ? (
                                    <div className="flex-1 flex gap-2">
                                      <input className="w-full px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={editingContentTitle} onChange={(e) => setEditingContentTitle(e.target.value)} />
                                      <input className="w-full px-3 py-2 rounded-xl bg-theme-surface border border-theme text-theme-primary" value={editingContentDesc} onChange={(e) => setEditingContentDesc(e.target.value)} />
                                    </div>
                                  ) : (
                                    <button className="flex-1 text-left" onClick={() => setExpandedContentId(c.id)}>
                                      <div className="font-medium truncate">{c.title}</div>
                                      {c.description && <div className="text-sm text-theme-secondary">{c.description}</div>}
                                    </button>
                                  )}
                                  <div className="flex gap-2 ml-auto">
                                    {editingContentId === c.id ? (
                                      <>
                                        <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => setEditingContentId(null)}>Cancelar</button>
                                        <button className="px-3 py-2 rounded-xl btn-primary" onClick={async () => { await updateContent(c.id, { title: editingContentTitle, description: editingContentDesc }); setEditingContentId(null); }}>Salvar</button>
                                      </>
                                    ) : contentsActive ? (
                                      <>
                                        <button className="px-3 py-2 rounded-xl border border-theme" onClick={() => { setEditingContentId(c.id); setEditingContentTitle(c.title); setEditingContentDesc(c.description || ''); }}>Editar</button>
                                        <button className="px-3 py-2 rounded-xl border border-theme text-red-500" onClick={async () => { if (confirm('Excluir este conteúdo?')) await deleteContent(c.id); }}>Excluir</button>
                                      </>
                                    ) : null}
                                  </div>
                                </li>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </ul>
                      )}
                    </Droppable>
                  </div>
                </div>
              )}
            </motion.div>

            {showLessons && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-6 grid place-items-center text-theme-secondary">
                <ChevronRight />
              </motion.div>
            )}

            {/* Lessons Pane */}
            <motion.div
              className="bg-transparent rounded-2xl border border-theme overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: showLessons ? '52%' : 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              {showLessons && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedContentId(null)} className="px-3 py-2 rounded-xl btn-soft flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
                      <h3 className="font-medium truncate">Aulas de "{expandedContentTitle}"</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = addingLessonForId === expandedContentId ? null : expandedContentId;
                        setAddingLessonForId(next);
                        if (next) { setNewLessonTitle(''); setNewLessonUrl(''); }
                      }}
                      className="px-3 py-1.5 rounded-xl border border-theme flex items-center gap-2 hover:bg-theme-surface-hover"
                    >
                      <Plus size={16} /> {addingLessonForId === expandedContentId ? 'Fechar' : 'Adicionar aula'}
                    </button>
                  </div>

                  {addingLessonForId === expandedContentId && (
                    <form className="flex flex-col sm:flex-row gap-2" onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newLessonTitle.trim() || !newLessonUrl.trim()) return;
                      await createLesson({ contentId: expandedContentId!, title: newLessonTitle.trim(), youtubeUrl: newLessonUrl.trim(), order: lessons.length });
                      setNewLessonTitle(''); setNewLessonUrl('');
                      setAddingLessonForId(null);
                    }}>
                      <input placeholder="Título da aula" className="flex-1 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} />
                      <input placeholder="Link do YouTube" className="flex-1 px-3 py-2 rounded-xl bg-theme-base border border-theme text-theme-primary" value={newLessonUrl} onChange={(e) => setNewLessonUrl(e.target.value)} />
                      <button className="px-3 py-2 rounded-xl btn-primary">Adicionar</button>
                    </form>
                  )}

                  <Droppable droppableId="lessons" type="LESSONS">
                    {(p2) => (
                      <ul ref={p2.innerRef} {...p2.droppableProps} className="space-y-2 p-2">
                        {lessons.map((l, idx) => (
                          <Draggable key={l.id} draggableId={l.id} index={idx} isDragDisabled={editingLessonId === l.id}>
                            {(drag2) => (
                              <li ref={drag2.innerRef} {...drag2.draggableProps} className="px-3 py-2 flex items-center gap-3 bg-transparent rounded-xl border border-theme hover:bg-theme-surface-hover/30">
                                <span {...drag2.dragHandleProps} className="text-theme-secondary cursor-grab active:cursor-grabbing select-none"><GripVertical size={18} /></span>
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
                                  <div className="flex items-center justify-between gap-2 w-full">
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{idx + 1}. {l.title}</div>
                                      <div className="text-sm text-theme-secondary truncate max-w-[50ch]">{l.youtubeUrl}</div>
                                    </div>
                                    <div className="flex gap-2 ml-auto">
                                      <button className="px-3 py-2 rounded-xl border border-theme flex items-center gap-2" onClick={() => { setEditingLessonId(l.id); setEditingLessonTitle(l.title); setEditingLessonUrl(l.youtubeUrl); }}>
                                        <Pencil size={16} /> Editar
                                      </button>
                                      <button className="px-3 py-2 rounded-xl border border-theme text-red-500 flex items-center gap-2" onClick={async () => { if (confirm('Excluir esta aula?')) await deleteLesson(l.id); }}>
                                        <Trash2 size={16} /> Excluir
                                      </button>
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
            </motion.div>
          </section>
        </DragDropContext>
      </div>
    </div>
  );
}
