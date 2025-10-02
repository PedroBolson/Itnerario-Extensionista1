import { useEffect, useState } from 'react';
import type { Topic, Content, Lesson } from '../lib/db';
import { listenTopics, listenContentsByTopic, listenLessonsByContent } from '../lib/db';

/**
 * Hook personalizado para gerenciar dados em tempo real do sistema de cursos.
 * Mantém sincronização automática com o Firebase usando listeners.
 */
export function useRealtimeData() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [contents, setContents] = useState<Content[]>([]);
    const [selectedContentId, setSelectedContentId] = useState('');
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [activeLessonId, setActiveLessonId] = useState('');

    // Estado para feedback visual
    const [lastUpdate, setLastUpdate] = useState<Date | undefined>(undefined);

    // Listener para todos os tópicos
    useEffect(() => {
        const unsubscribe = listenTopics((newTopics) => {
            setTopics(newTopics);
            setLastUpdate(new Date());
        });

        return unsubscribe;
    }, []);

    // Listener para conteúdos do tópico selecionado
    useEffect(() => {
        if (!selectedTopicId) {
            setContents([]);
            setSelectedContentId('');
            setLessons([]);
            setActiveLessonId('');
            return;
        }

        const unsubscribe = listenContentsByTopic(selectedTopicId, (newContents) => {
            setContents(newContents);
            setLastUpdate(new Date());
        });

        return unsubscribe;
    }, [selectedTopicId]);

    // Listener para lições do conteúdo selecionado
    useEffect(() => {
        if (!selectedContentId) {
            setLessons([]);
            setActiveLessonId('');
            return;
        }

        const unsubscribe = listenLessonsByContent(selectedContentId, (items) => {
            setLessons(items);
            setLastUpdate(new Date());
            // Auto-seleciona a primeira lição se não há nenhuma ativa ou se a ativa não existe mais
            if (items.length > 0 && (!activeLessonId || !items.find(l => l.id === activeLessonId))) {
                setActiveLessonId(items[0].id);
            }
        });

        return unsubscribe;
    }, [selectedContentId, activeLessonId]);

    // Resetar conteúdos e lições quando o tópico muda
    useEffect(() => {
        setSelectedContentId('');
        setActiveLessonId('');
    }, [selectedTopicId]);

    // Resetar lições quando o conteúdo muda  
    useEffect(() => {
        setActiveLessonId('');
    }, [selectedContentId]);

    return {
        // Dados
        topics,
        contents,
        lessons,

        // Estados de seleção
        selectedTopicId,
        selectedContentId,
        activeLessonId,

        // Setters para navegação
        setSelectedTopicId,
        setSelectedContentId,
        setActiveLessonId,

        // Estados de sincronização
        lastUpdate,
    };
}