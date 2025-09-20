import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  LayoutGrid,
  Pencil,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import type { Topic, Content, Lesson } from '../../lib/db';
import {
  createTopic,
  createContent,
  createLesson,
  updateTopic,
  updateContent,
  updateLesson,
  deleteTopic,
  deleteContent,
  deleteLesson,
  listenTopics,
  listenContentsByTopic,
  listenLessonsByContent,
  reorderTopics,
  reorderContents,
  reorderLessons,
} from '../../lib/db';

import { CourseImage } from '../../components/CourseImage';
import { CategoryIcon } from '../../components/CategoryIcon';
import {
  TOPIC_CATEGORIES,
  DIFFICULTY_LEVELS,
  getCategoryInfo,
  getDifficultyInfo,
  generateColorFromString,
  type TopicCategory,
  type DifficultyLevel,
} from '../../lib/courseUtils';
import { YouTubePlayer } from '../../components/YouTubePlayer';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AdminModal } from '../../components/AdminModal';

interface TopicFormState {
  name: string;
  category: string;
  coverImageUrl: string;
}

interface ContentFormState {
  title: string;
  description: string;
  coverImageUrl: string;
  difficulty: string;
}

interface LessonFormState {
  title: string;
  youtubeUrl: string;
  description: string;
}

type FormTarget =
  | { entity: 'topic'; mode: 'create' }
  | { entity: 'topic'; mode: 'edit'; item: Topic }
  | { entity: 'content'; mode: 'create' }
  | { entity: 'content'; mode: 'edit'; item: Content }
  | { entity: 'lesson'; mode: 'create' }
  | { entity: 'lesson'; mode: 'edit'; item: Lesson };

type PendingDelete =
  | { entity: 'topic'; item: Topic }
  | { entity: 'content'; item: Content }
  | { entity: 'lesson'; item: Lesson }
  | null;

function createEmptyTopicForm(): TopicFormState {
  return { name: '', category: '', coverImageUrl: '' };
}

function createEmptyContentForm(): ContentFormState {
  return { title: '', description: '', coverImageUrl: '', difficulty: '' };
}

function createEmptyLessonForm(): LessonFormState {
  return { title: '', youtubeUrl: '', description: '' };
}

export function DashboardPage() {

  const [topics, setTopics] = useState<Topic[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedContentId, setSelectedContentId] = useState('');
  const [activeLessonId, setActiveLessonId] = useState('');

  const [topicQuery, setTopicQuery] = useState('');
  const [contentQuery, setContentQuery] = useState('');

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [topicForm, setTopicForm] = useState<TopicFormState>(createEmptyTopicForm());
  const [contentForm, setContentForm] = useState<ContentFormState>(createEmptyContentForm());
  const [lessonForm, setLessonForm] = useState<LessonFormState>(createEmptyLessonForm());

  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);



  useEffect(() => listenTopics(setTopics), []);
  useEffect(() => {
    if (!selectedTopicId) {
      setContents([]);
      return;
    }
    return listenContentsByTopic(selectedTopicId, setContents);
  }, [selectedTopicId]);

  useEffect(() => {
    if (!selectedContentId) {
      setLessons([]);
      return;
    }
    return listenLessonsByContent(selectedContentId, (items) => {
      setLessons(items);
      if (items.length > 0 && !items.find((lesson) => lesson.id === activeLessonId)) {
        setActiveLessonId(items[0].id);
      }
    });
  }, [selectedContentId, activeLessonId]);

  const activeStage: 'topics' | 'contents' | 'lessons' = !selectedTopicId ? 'topics' : !selectedContentId ? 'contents' : 'lessons';

  const activeTopic = useMemo(() => topics.find((topic) => topic.id === selectedTopicId) || null, [topics, selectedTopicId]);
  const activeContent = useMemo(() => contents.find((content) => content.id === selectedContentId) || null, [contents, selectedContentId]);
  const activeLesson = useMemo(() => lessons.find((lesson) => lesson.id === activeLessonId) || null, [lessons, activeLessonId]);



  const filteredTopics = useMemo(() => {
    const key = topicQuery.trim().toLowerCase();
    if (!key) return topics;
    return topics.filter((topic) => topic.name.toLowerCase().includes(key));
  }, [topics, topicQuery]);

  const filteredContents = useMemo(() => {
    const key = contentQuery.trim().toLowerCase();
    if (!key) return contents;
    return contents.filter((content) => [content.title, content.description || ''].some((value) => value.toLowerCase().includes(key)));
  }, [contents, contentQuery]);

  const lessonsSummary = useMemo(() => {
    if (lessons.length === 0) return 'Nenhuma aula cadastrada';
    return `${lessons.length} aula${lessons.length > 1 ? 's' : ''}`;
  }, [lessons]);

  const openForm = (target: FormTarget) => {
    setFormTarget(target);
    if (target.entity === 'topic' && target.mode === 'edit') {
      setTopicForm({
        name: target.item.name,
        category: target.item.category || '',
        coverImageUrl: target.item.coverImageUrl || '',
      });
    } else if (target.entity === 'content' && target.mode === 'edit') {
      setContentForm({
        title: target.item.title,
        description: target.item.description || '',
        coverImageUrl: target.item.coverImageUrl || '',
        difficulty: target.item.difficulty || '',
      });
    } else if (target.entity === 'lesson' && target.mode === 'edit') {
      setLessonForm({
        title: target.item.title,
        youtubeUrl: target.item.youtubeUrl,
        description: target.item.description || '',
      });
    } else {
      if (target.entity === 'topic') setTopicForm(createEmptyTopicForm());
      if (target.entity === 'content') setContentForm(createEmptyContentForm());
      if (target.entity === 'lesson') setLessonForm(createEmptyLessonForm());
    }
  };

  const closeForm = () => {
    setFormTarget(null);
  };

  const handleTopicSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const categoryKey = (topicForm.category in TOPIC_CATEGORIES ? topicForm.category : 'other') as TopicCategory;
    const color = getCategoryInfo(categoryKey).color;

    const payload: Partial<Topic> = {
      name: topicForm.name.trim(),
      category: categoryKey,
      color,
      coverImageUrl: topicForm.coverImageUrl.trim() || undefined,
    };

    if (!payload.name) return;

    try {
      if (formTarget?.entity === 'topic' && formTarget.mode === 'edit') {
        await updateTopic(formTarget.item.id, payload);
      } else {
        await createTopic({
          ...payload,
          order: topics.length,
        } as Omit<Topic, 'id' | 'createdAt'>);
      }
      closeForm();
    } catch (error) {
      console.error('Erro ao salvar tópico:', error);
    }
  };

  const handleContentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTopic) return;

    const title = contentForm.title.trim();
    const description = contentForm.description.trim();
    const coverImageUrl = contentForm.coverImageUrl.trim();
    const difficulty = contentForm.difficulty in DIFFICULTY_LEVELS
      ? (contentForm.difficulty as DifficultyLevel)
      : undefined;
    const payload: Partial<Content> = {
      topicId: activeTopic.id,
      title,
    };

    if (description) payload.description = description;
    if (coverImageUrl) payload.coverImageUrl = coverImageUrl;
    if (difficulty) payload.difficulty = difficulty;

    if (!payload.title) return;

    try {
      if (formTarget?.entity === 'content' && formTarget.mode === 'edit') {
        await updateContent(formTarget.item.id, payload);
      } else {
        await createContent({
          ...payload,
          order: contents.length,
        } as Omit<Content, 'id' | 'createdAt'>);
      }
      closeForm();
    } catch (error) {
      console.error('Erro ao salvar curso:', error);
    }
  };

  const handleLessonSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeContent) return;

    const payload: Partial<Lesson> = {
      title: lessonForm.title.trim(),
      youtubeUrl: lessonForm.youtubeUrl.trim(),
      description: lessonForm.description.trim() || undefined,
      contentId: activeContent.id,
    };

    if (!payload.title || !payload.youtubeUrl) return;

    try {
      if (formTarget?.entity === 'lesson' && formTarget.mode === 'edit') {
        await updateLesson(formTarget.item.id, payload);
      } else {
        await createLesson({
          ...payload,
          order: lessons.length,
        } as Omit<Lesson, 'id' | 'createdAt'>);
      }
      closeForm();
    } catch (error) {
      console.error('Erro ao salvar aula:', error);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'TOPICS') {
      const ordered = Array.from(topics);
      const [moved] = ordered.splice(source.index, 1);
      ordered.splice(destination.index, 0, moved);
      setTopics(ordered);
      reorderTopics(ordered.map((item) => item.id)).catch(console.error);
    }

    if (type === 'CONTENTS') {
      const ordered = Array.from(contents);
      const [moved] = ordered.splice(source.index, 1);
      ordered.splice(destination.index, 0, moved);
      setContents(ordered);
      reorderContents(ordered.map((item) => item.id)).catch(console.error);
    }

    if (type === 'LESSONS') {
      const ordered = Array.from(lessons);
      const [moved] = ordered.splice(source.index, 1);
      ordered.splice(destination.index, 0, moved);
      setLessons(ordered);
      reorderLessons(ordered.map((item) => item.id)).catch(console.error);
    }
  };

  const confirmDeletion = (entry: PendingDelete) => {
    setPendingDelete(entry);
  };

  const executeDeletion = async () => {
    if (!pendingDelete) return;

    try {
      if (pendingDelete.entity === 'topic') {
        await deleteTopic(pendingDelete.item.id);
        if (pendingDelete.item.id === selectedTopicId) {
          setSelectedTopicId('');
          setSelectedContentId('');
          setActiveLessonId('');
        }
      }

      if (pendingDelete.entity === 'content') {
        await deleteContent(pendingDelete.item.id);
        if (pendingDelete.item.id === selectedContentId) {
          setSelectedContentId('');
          setActiveLessonId('');
        }
      }

      if (pendingDelete.entity === 'lesson') {
        await deleteLesson(pendingDelete.item.id);
        if (pendingDelete.item.id === activeLessonId) {
          setActiveLessonId('');
        }
      }
    } catch (error) {
      console.error('Erro ao excluir item:', error);
    }
  };



  const deletionTitle = pendingDelete
    ? pendingDelete.entity === 'lesson'
      ? 'Excluir aula'
      : pendingDelete.entity === 'content'
        ? 'Excluir curso'
        : 'Excluir tópico'
    : '';

  const deletionName = pendingDelete
    ? pendingDelete.entity === 'topic'
      ? pendingDelete.item.name
      : pendingDelete.item.title
    : '';

  return (
    <div className="min-h-screen bg-theme-base text-theme-primary">
      <div className="max-w-[1200px] xl:max-w-[1400px] mx-auto px-6 pt-24 pb-12 space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <LayoutGrid size={20} />
              Painel de Conteúdo
            </h1>
            <p className="text-theme-secondary">Manipule tópicos, cursos e aulas com a mesma experiência da página pública.</p>
          </div>
        </header>

        <DragDropContext onDragEnd={handleDragEnd}>
          {activeStage === 'topics' && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Tópicos</h2>
                  <p className="text-sm text-theme-secondary">Selecione um tópico para ver seus cursos ou reordene arrastando os cards.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    placeholder="Buscar tópicos"
                    value={topicQuery}
                    onChange={(event) => setTopicQuery(event.target.value)}
                    className="px-3 py-2 rounded-xl border border-theme bg-theme-base text-sm min-w-[220px]"
                  />
                  <button
                    onClick={() => openForm({ entity: 'topic', mode: 'create' })}
                    className="px-4 py-2 rounded-xl btn-primary flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Novo tópico
                  </button>
                </div>
              </div>

              <Droppable droppableId="admin-topics" direction="horizontal" type="TOPICS">
                {(droppableProvided) => (
                  <div
                    ref={droppableProvided.innerRef}
                    {...droppableProvided.droppableProps}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                  >
                    {filteredTopics.map((topic, index) => {
                      const categoryInfo = getCategoryInfo(topic.category);
                      return (
                        <Draggable draggableId={topic.id} index={index} key={topic.id}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`group relative overflow-hidden rounded-2xl border bg-theme-surface text-left hover:shadow-lg cursor-grab active:cursor-grabbing ${selectedTopicId === topic.id
                                ? 'ring-2 ring-blue-500 border-blue-500'
                                : 'border-theme hover:border-gray-300'
                                }`}
                              onClick={() => {
                                setSelectedTopicId(topic.id);
                                setSelectedContentId('');
                                setActiveLessonId('');
                              }}
                            >
                              <div className="relative">
                                <CourseImage
                                  src={topic.coverImageUrl}
                                  alt={topic.name}
                                  fallbackColor={topic.color || generateColorFromString(topic.name)}
                                  fallbackIcon={categoryInfo.icon}
                                  aspectRatio="video"
                                  className="group-hover:scale-105 transition-transform duration-300"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-xl" />

                                <div
                                  className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1"
                                  style={{ backgroundColor: categoryInfo.color + '90' }}
                                >
                                  <CategoryIcon Icon={categoryInfo.icon} size={12} />
                                  <span>{categoryInfo.name}</span>
                                </div>

                                <div className="absolute top-3 left-3 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openForm({ entity: 'topic', mode: 'edit', item: topic });
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur-sm"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      confirmDeletion({ entity: 'topic', item: topic });
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/70 text-white hover:bg-red-500 backdrop-blur-sm"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                  <h3 className="font-semibold text-white text-lg leading-tight">{topic.name}</h3>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {droppableProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </section>
          )}

          {activeStage === 'contents' && activeTopic && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-theme-secondary">
                  <button
                    onClick={() => {
                      setSelectedTopicId('');
                      setSelectedContentId('');
                      setActiveLessonId('');
                    }}
                    className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    Tópicos
                  </button>
                  <ChevronRight size={14} />
                  <span className="text-theme-primary font-medium">{activeTopic.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    placeholder="Buscar cursos"
                    value={contentQuery}
                    onChange={(event) => setContentQuery(event.target.value)}
                    className="px-3 py-2 rounded-xl border border-theme bg-theme-base text-sm min-w-[220px]"
                  />
                  <button
                    onClick={() => openForm({ entity: 'content', mode: 'create' })}
                    className="px-4 py-2 rounded-xl btn-primary flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Novo curso
                  </button>
                </div>
              </div>

              <Droppable droppableId="admin-contents" type="CONTENTS">
                {(droppableProvided) => (
                  <div
                    ref={droppableProvided.innerRef}
                    {...droppableProvided.droppableProps}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                  >
                    {filteredContents.map((content, index) => {
                      const difficulty = getDifficultyInfo(content.difficulty);
                      return (
                        <Draggable draggableId={content.id} index={index} key={content.id}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`group relative overflow-hidden rounded-2xl border bg-theme-surface text-left hover:shadow-lg cursor-grab active:cursor-grabbing ${selectedContentId === content.id
                                ? 'ring-2 ring-blue-500 border-blue-500'
                                : 'border-theme hover:border-gray-300'
                                }`}
                              onClick={() => {
                                setSelectedContentId(content.id);
                                setActiveLessonId('');
                              }}
                            >
                              <div className="relative overflow-hidden">
                                <CourseImage
                                  src={content.coverImageUrl}
                                  alt={content.title}
                                  fallbackColor={generateColorFromString(content.title)}
                                  fallbackIcon={difficulty.icon}
                                  aspectRatio="video"
                                  className="group-hover:scale-105 transition-transform duration-300"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-xl" />

                                <div
                                  className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1"
                                  style={{ backgroundColor: difficulty.color + '90' }}
                                >
                                  <CategoryIcon Icon={difficulty.icon} size={12} />
                                  <span>{difficulty.name}</span>
                                </div>



                                <div className="absolute bottom-3 right-3 flex gap-2">
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openForm({ entity: 'content', mode: 'edit', item: content });
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur-sm"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      confirmDeletion({ entity: 'content', item: content });
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/70 text-white hover:bg-red-500 backdrop-blur-sm"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="p-4 space-y-2">
                                <h3 className="font-semibold text-base leading-tight line-clamp-2">{content.title}</h3>
                                {content.description && (
                                  <p className="text-sm text-theme-secondary line-clamp-3">{content.description}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {droppableProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </section>
          )}

          {activeStage === 'lessons' && activeTopic && activeContent && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-theme-secondary">
                  <button
                    onClick={() => {
                      setSelectedContentId('');
                      setActiveLessonId('');
                    }}
                    className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    {activeTopic.name}
                  </button>
                  <ChevronRight size={14} />
                  <span className="text-theme-primary font-medium">{activeContent.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-theme-secondary">{lessonsSummary}</span>
                  <button
                    onClick={() => openForm({ entity: 'lesson', mode: 'create' })}
                    className="px-4 py-2 rounded-xl btn-primary flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Nova aula
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 space-y-3">
                  <div className="rounded-2xl border border-theme p-1 bg-theme-surface">
                    {activeLesson ? (
                      <YouTubePlayer
                        url={activeLesson.youtubeUrl}
                        title={activeLesson.title}
                        lessonId={activeLesson.id}
                        contentId={activeContent.id}
                        topicId={activeTopic.id}
                        contentTitle={activeContent.title}
                        topicTitle={activeTopic.name}
                      />
                    ) : (
                      <div className="aspect-video w-full rounded-xl bg-theme-base grid place-items-center text-theme-muted">
                        Selecione uma aula
                      </div>
                    )}
                  </div>
                  {activeLesson && (
                    <div className="rounded-xl border border-theme bg-theme-surface px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-theme-primary">{activeLesson.title}</div>
                        <div className="text-xs text-theme-secondary flex items-center gap-2">
                          <Video size={14} className="text-red-500" />
                          {activeLesson.youtubeUrl}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openForm({ entity: 'lesson', mode: 'edit', item: activeLesson })}
                          className="px-3 py-2 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary"
                        >
                          Editar aula
                        </button>
                        <button
                          onClick={() => confirmDeletion({ entity: 'lesson', item: activeLesson })}
                          className="px-3 py-2 rounded-xl border border-red-500 text-red-500 hover:bg-red-500/10"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <aside className="rounded-2xl border border-theme bg-theme-surface p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <BookOpen size={16} />
                    Aulas do curso
                  </h3>
                  <Droppable droppableId="admin-lessons" type="LESSONS">
                    {(droppableProvided) => (
                      <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps} className="space-y-2">
                        {lessons.map((lesson, index) => (
                          <Draggable draggableId={lesson.id} index={index} key={lesson.id}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 rounded-xl border ${lesson.id === activeLessonId ? 'border-blue-500 bg-blue-500/5' : 'border-theme bg-theme-base'} cursor-grab active:cursor-grabbing transition-colors`}
                                onClick={() => setActiveLessonId(lesson.id)}
                              >
                                <div className="text-sm font-medium text-theme-primary">{lesson.title}</div>
                                <div className="text-xs text-theme-secondary line-clamp-2">{lesson.description || 'Sem descrição'}</div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {droppableProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </aside>
              </div>
            </section>
          )}
        </DragDropContext>
      </div>

      {formTarget?.entity === 'topic' && (
        <AdminModal
          isOpen={!!formTarget}
          onClose={closeForm}
          title={formTarget.mode === 'edit' ? 'Editar Tópico' : 'Novo Tópico'}
          subtitle="Ajuste título, categoria e capa exibidos na página pública"
          onSubmit={handleTopicSubmit}
          submitLabel="Tópico"
          isEdit={formTarget.mode === 'edit'}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">Nome</span>
              <input
                required
                value={topicForm.name}
                onChange={(event) => setTopicForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite o nome do tópico"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">Categoria</span>
              <select
                value={topicForm.category}
                onChange={(event) => setTopicForm((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma categoria</option>
                {Object.entries(TOPIC_CATEGORIES).map(([key, info]) => (
                  <option value={key} key={key}>{info.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">Imagem de Capa</span>
              <input
                value={topicForm.coverImageUrl}
                onChange={(event) => setTopicForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <p className="text-xs text-theme-secondary mt-1">URL da imagem que será exibida como capa do tópico</p>
            </label>
          </div>
        </AdminModal>
      )}

      {formTarget?.entity === 'content' && (
        <AdminModal
          isOpen={!!formTarget}
          onClose={closeForm}
          title={formTarget.mode === 'edit' ? 'Editar Curso' : 'Novo Curso'}
          subtitle="Defina título, descrição, capa e dificuldade para o curso"
          onSubmit={handleContentSubmit}
          submitLabel="Curso"
          isEdit={formTarget.mode === 'edit'}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">Título</span>
              <input
                required
                value={contentForm.title}
                onChange={(event) => setContentForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite o título do curso"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">Descrição</span>
              <textarea
                rows={4}
                value={contentForm.description}
                onChange={(event) => setContentForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Descreva o conteúdo do curso"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">Dificuldade</span>
              <select
                value={contentForm.difficulty}
                onChange={(event) => setContentForm((prev) => ({ ...prev, difficulty: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione a dificuldade</option>
                {Object.entries(DIFFICULTY_LEVELS).map(([key, info]) => (
                  <option value={key} key={key}>{info.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">Imagem de Capa</span>
              <input
                value={contentForm.coverImageUrl}
                onChange={(event) => setContentForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </label>
          </div>
        </AdminModal>
      )}

      {formTarget?.entity === 'lesson' && (
        <AdminModal
          isOpen={!!formTarget}
          onClose={closeForm}
          title={formTarget.mode === 'edit' ? 'Editar Aula' : 'Nova Aula'}
          subtitle="Adicione vídeos do YouTube e notas complementares para cada aula"
          onSubmit={handleLessonSubmit}
          submitLabel="Aula"
          isEdit={formTarget.mode === 'edit'}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">Título</span>
              <input
                required
                value={lessonForm.title}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite o título da aula"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">URL do YouTube</span>
              <input
                required
                value={lessonForm.youtubeUrl}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, youtubeUrl: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-theme-secondary mt-1">Cole o link do vídeo do YouTube</p>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-theme-primary mb-2 block">Descrição</span>
              <textarea
                rows={3}
                value={lessonForm.description}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-xl border border-theme bg-theme-base px-4 py-3 text-theme-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Descreva o conteúdo da aula (opcional)"
              />
            </label>
          </div>
        </AdminModal>
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={executeDeletion}
        title={deletionTitle}
        message={pendingDelete ? `Tem certeza que deseja excluir "${deletionName}"? Essa ação não pode ser desfeita.` : ''}
      />
    </div>
  );
}
