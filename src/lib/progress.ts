import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

const PARTICIPANTS_COLLECTION = 'learningProgress';

export type ParticipantRecord = {
  code: string;
  displayName?: string;
  createdAt: Timestamp;
  lastActiveAt?: Timestamp;
};

export type LearningProgress = {
  id: string;
  participantId: string;
  lessonId: string;
  contentId?: string;
  topicId?: string;
  topicTitle?: string;
  lastPosition: number;
  duration: number;
  completed: boolean;
  updatedAt: Date;
  completedAt?: Date;
  lessonTitle?: string;
  contentTitle?: string;
};

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
  lessonTitle?: string;
  contentId?: string;
  contentTitle?: string;
  topicId?: string;
  topicTitle?: string;
};

function participantDoc(code: string) {
  return doc(db, PARTICIPANTS_COLLECTION, code.toUpperCase());
}

function normalizeString(value?: string | null) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapLessonProgress(participantId: string, lessonId: string, data: DocumentData | undefined): LearningProgress {
  if (!data) {
    return {
      id: lessonId,
      participantId,
      lessonId,
      lastPosition: 0,
      duration: 0,
      completed: false,
      updatedAt: new Date(0),
    };
  }

  const updatedAt = (data.updatedAt as Timestamp | undefined)?.toDate() ?? new Date(0);
  const completedAtRaw = data.completedAt as Timestamp | null | undefined;

  return {
    id: lessonId,
    participantId,
    lessonId,
    contentId: typeof data.contentId === 'string' && data.contentId.length > 0 ? data.contentId : undefined,
    topicId: typeof data.topicId === 'string' && data.topicId.length > 0 ? data.topicId : undefined,
    topicTitle: typeof data.topicTitle === 'string' && data.topicTitle.length > 0 ? data.topicTitle : undefined,
    lastPosition: typeof data.lastPosition === 'number' ? data.lastPosition : 0,
    duration: typeof data.duration === 'number' ? data.duration : 0,
    completed: Boolean(data.completed),
    updatedAt,
    completedAt: completedAtRaw ? completedAtRaw.toDate() : undefined,
    lessonTitle: typeof data.lessonTitle === 'string' && data.lessonTitle.length > 0 ? data.lessonTitle : undefined,
    contentTitle: typeof data.contentTitle === 'string' && data.contentTitle.length > 0 ? data.contentTitle : undefined,
  };
}

export function generateAccessCode(length = 4) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export async function createParticipant(displayName?: string) {
  const code = generateAccessCode();
  const payload: DocumentData = {
    code,
    displayName: displayName?.trim() || null,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  };
  await setDoc(participantDoc(code), payload);
  return code;
}

export async function fetchParticipant(code: string): Promise<ParticipantRecord | null> {
  const snap = await getDoc(participantDoc(code));
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;
  return {
    code: data.code as string,
    displayName: (data.displayName as string | null) || undefined,
    createdAt: data.createdAt as Timestamp,
    lastActiveAt: data.lastActiveAt as Timestamp | undefined,
  };
}

export function listenParticipant(code: string, cb: (participant: ParticipantRecord | null) => void): Unsubscribe {
  return onSnapshot(participantDoc(code), (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const data = snap.data() as DocumentData;
    cb({
      code: data.code as string,
      displayName: (data.displayName as string | null) || undefined,
      createdAt: data.createdAt as Timestamp,
      lastActiveAt: data.lastActiveAt as Timestamp | undefined,
    });
  });
}

export async function saveLessonProgress(params: SaveLessonProgressParams) {
  const participantId = params.participantId.toUpperCase();
  const payload: DocumentData = {
    lastPosition: Math.max(0, params.lastPosition || 0),
    duration: Math.max(0, params.duration || 0),
    completed: Boolean(params.completed),
    lessonTitle: normalizeString(params.lessonTitle),
    contentTitle: normalizeString(params.contentTitle),
    contentId: normalizeString(params.contentId),
    topicId: normalizeString(params.topicId),
    topicTitle: normalizeString(params.topicTitle),
    updatedAt: serverTimestamp(),
  };

  if (params.completed) {
    payload.completedAt = serverTimestamp();
  } else {
    payload.completedAt = null;
  }

  await setDoc(participantDoc(participantId), {
    lastActiveAt: serverTimestamp(),
    lessonProgress: {
      [params.lessonId]: payload,
    },
  }, { merge: true });
}

export async function getLessonProgress(participantId: string, lessonId: string): Promise<LearningProgress | null> {
  const docSnap = await getDoc(participantDoc(participantId));
  if (!docSnap.exists()) return null;
  const data = docSnap.data() as DocumentData | undefined;
  const lessonProgress = data?.lessonProgress as Record<string, DocumentData> | undefined;
  const entry = lessonProgress?.[lessonId];
  if (!entry) return null;
  return mapLessonProgress(participantId.toUpperCase(), lessonId, entry);
}

export async function getAllProgressForParticipant(participantId: string): Promise<LearningProgress[]> {
  const docSnap = await getDoc(participantDoc(participantId));
  if (!docSnap.exists()) return [];
  const data = docSnap.data() as DocumentData | undefined;
  const lessonProgress = data?.lessonProgress as Record<string, DocumentData> | undefined;
  if (!lessonProgress) return [];
  const progress = Object.entries(lessonProgress).map(([lessonId, entry]) =>
    mapLessonProgress(participantId.toUpperCase(), lessonId, entry),
  );
  return progress.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function subscribeToProgress(participantId: string, callback: (progress: LearningProgress[]) => void): Unsubscribe {
  return onSnapshot(participantDoc(participantId), (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const data = snap.data() as DocumentData | undefined;
    const lessonProgress = data?.lessonProgress as Record<string, DocumentData> | undefined;
    if (!lessonProgress) {
      callback([]);
      return;
    }
    const progress = Object.entries(lessonProgress)
      .map(([lessonId, entry]) => mapLessonProgress(participantId.toUpperCase(), lessonId, entry))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    callback(progress);
  });
}

export async function getAllParticipants() {
  const participantsSnapshot = await getDocs(collection(db, PARTICIPANTS_COLLECTION));
  const results: Array<{
    id: string;
    displayName: string;
    totalLessons: number;
    completedLessons: number;
    totalWatchTime: number;
    lastActive: Date;
    progress: LearningProgress[];
  }> = [];

  for (const participantDocSnap of participantsSnapshot.docs) {
    const participantId = participantDocSnap.id;
    const participantData = participantDocSnap.data();
    const lessonProgress = (participantData.lessonProgress as Record<string, DocumentData> | undefined) ?? {};
    const progress = Object.entries(lessonProgress)
      .map(([lessonId, entry]) => mapLessonProgress(participantId, lessonId, entry))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    results.push({
      id: participantId,
      displayName: typeof participantData.displayName === 'string' && participantData.displayName.length > 0
        ? participantData.displayName
        : participantId,
      totalLessons: progress.length,
      completedLessons: progress.filter((p) => p.completed).length,
      totalWatchTime: progress.reduce((total, p) => total + (p.lastPosition || 0), 0),
      lastActive: (participantData.lastActiveAt as Timestamp | undefined)?.toDate() ?? new Date(0),
      progress,
    });
  }

  return results;
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
  await setDoc(participantDoc(code), {
    lastActiveAt: serverTimestamp(),
    lessonProgress: {
      [lessonId]: {
        completed: false,
        completedAt: null,
        updatedAt: serverTimestamp(),
      },
    },
  }, { merge: true });
}
