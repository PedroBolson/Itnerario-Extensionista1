import {
  getLessonProgress as getLessonProgressInternal,
  listParticipants,
  recordLessonProgress,
  resetLessonProgress as resetLessonProgressInternal,
  subscribeParticipant,
  subscribeProgress,
  touchParticipant,
  upsertParticipant,
} from './memoryStore';
import type { LearningProgress, ParticipantRecord } from './types';
import { hydrateFromRemote } from './remoteSync';
import { isBackendAvailable, remoteUpsertRecords, remoteFetchParticipant } from './remoteStore';

export type { ParticipantRecord, LearningProgress } from './types';

export type ProgressStats = {
  totalLessons: number;
  completedLessons: number;
  totalWatchTime: number;
  lastUpdated: Date;
};

type SaveLessonProgressParams = {
  participantId: string;
  lessonId: string;
  lastPosition: number;
  duration: number;
  completed: boolean;
  contentId?: string;
  topicId?: string;
};

export function generateAccessCode(length = 6) {
  // Alfabeto sem letras ambíguas (I, O) e números ambíguos (0, 1)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function serializeParticipantForRemote(participant: ReturnType<typeof listParticipants>[number]) {
  return {
    code: participant.code,
    displayName: participant.displayName ?? '',
    createdAt: participant.createdAt,
    lastActiveAt: participant.lastActiveAt ?? participant.createdAt,
    lessonProgress: JSON.stringify(participant.lessonProgress ?? {}),
  };
}

async function syncParticipantsWithRemote() {
  // IMPORTANTE: Permite sincronizar participantes mesmo sem sessão de admin
  // (necessário para criação pública de códigos de rastreio)
  if (!isBackendAvailable()) return;
  try {
    const participants = listParticipants().map(serializeParticipantForRemote);
    if (participants.length === 0) return;
    await remoteUpsertRecords('participants', participants);
    await hydrateFromRemote();
  } catch (error) {
    console.warn('Falha ao sincronizar participantes com backend:', error);
  }
}

export async function createParticipant(displayName?: string) {
  const code = generateAccessCode();
  const now = new Date();
  upsertParticipant({
    code,
    displayName: displayName?.trim() || undefined,
    createdAt: now,
    lastActiveAt: now,
    lessonProgress: {},
  });
  await syncParticipantsWithRemote();
  return code;
}

export async function fetchParticipant(code: string): Promise<ParticipantRecord | null> {
  // SEMPRE busca direto do servidor
  const upperCode = code.toUpperCase();
  
  try {
    const data = await remoteFetchParticipant(upperCode);
    
    if (!data) return null;
    
    // Converte para ParticipantState (com lessonProgress)
    let lessonProgress: Record<string, LearningProgress> = {};
    
    // Parse lessonProgress se existir
    if (data.lessonProgress) {
      try {
        const parsed = typeof data.lessonProgress === 'string' 
          ? JSON.parse(data.lessonProgress) 
          : data.lessonProgress;
        lessonProgress = parsed || {};
      } catch {
        lessonProgress = {};
      }
    }
    
    const participantState = {
      code: String(data.code || upperCode),
      displayName: data.displayName ? String(data.displayName) : undefined,
      createdAt: new Date(String(data.createdAt || Date.now())),
      lastActiveAt: data.lastActiveAt ? new Date(String(data.lastActiveAt)) : new Date(),
      lessonProgress,
    };
    
    // Atualiza memoryStore também (para sincronizar)
    upsertParticipant(participantState);
    
    // Retorna apenas o ParticipantRecord (sem lessonProgress)
    const { lessonProgress: _, ...participant } = participantState;
    return participant;
  } catch (error) {
    console.error('Erro ao buscar participante:', error);
    return null;
  }
}

export function listenParticipant(code: string, cb: (participant: ParticipantRecord | null) => void) {
  return subscribeParticipant(code.toUpperCase(), cb);
}

export async function saveLessonProgress(params: SaveLessonProgressParams) {
  const now = new Date();
  const participantId = params.participantId.toUpperCase();

  const progress: LearningProgress = {
    id: params.lessonId,
    participantId,
    lessonId: params.lessonId,
    contentId: params.contentId?.trim() || undefined,
    topicId: params.topicId?.trim() || undefined,
    lastPosition: Math.max(0, params.lastPosition || 0),
    duration: Math.max(0, params.duration || 0),
    completed: Boolean(params.completed),
    updatedAt: now,
    completedAt: params.completed ? now : undefined,
  };

  recordLessonProgress(participantId, params.lessonId, progress);
  touchParticipant(participantId, { lastActiveAt: now });
  await syncParticipantsWithRemote();
}

export async function getLessonProgress(participantId: string, lessonId: string): Promise<LearningProgress | null> {
  return getLessonProgressInternal(participantId.toUpperCase(), lessonId);
}

export async function getAllProgressForParticipant(participantId: string): Promise<LearningProgress[]> {
  const participant = listParticipants().find((item) => item.code === participantId.toUpperCase());
  if (!participant) return [];
  const progress = Object.values(participant.lessonProgress ?? {}).map((entry) => ({ ...entry }));
  return progress.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function subscribeToProgress(participantId: string, callback: (progress: LearningProgress[]) => void) {
  return subscribeProgress(participantId.toUpperCase(), callback);
}

export async function getAllParticipants() {
  return listParticipants().map((participant) => {
    const progressList = Object.values(participant.lessonProgress ?? {}).map((entry) => ({ ...entry }));
    const sorted = progressList.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return {
      id: participant.code,
      displayName: participant.displayName || participant.code,
      totalLessons: sorted.length,
      completedLessons: sorted.filter((p) => p.completed).length,
      totalWatchTime: sorted.reduce((total, p) => total + (p.lastPosition || 0), 0),
      lastActive: participant.lastActiveAt ?? participant.createdAt,
      progress: sorted,
    };
  });
}

export async function getProgressStats(participantId: string): Promise<ProgressStats> {
  const allProgress = await getAllProgressForParticipant(participantId);
  const totalLessons = allProgress.length;
  const completedLessons = allProgress.filter((p) => p.completed).length;
  const totalWatchTime = allProgress.reduce((total, p) => total + (p.lastPosition || 0), 0);
  const lastUpdated = allProgress.length > 0 ? allProgress[0].updatedAt : new Date();

  return {
    totalLessons,
    completedLessons,
    totalWatchTime,
    lastUpdated,
  };
}

export function isLessonCompleted(currentTime: number, duration: number) {
  if (duration <= 0) return false;
  const remaining = duration - currentTime;
  return remaining <= 5 || currentTime / duration >= 0.95;
}

export async function resetLessonCompletion(code: string, lessonId: string) {
  resetLessonProgressInternal(code.toUpperCase(), lessonId);
  await syncParticipantsWithRemote();
}

export function markParticipantActive(code: string) {
  const now = new Date();
  touchParticipant(code.toUpperCase(), { lastActiveAt: now });
  void syncParticipantsWithRemote();
}
