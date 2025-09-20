import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  writeBatch,
  Timestamp,
  type DocumentData,
  type UpdateData,
} from 'firebase/firestore';
import { db } from './firebase';

export type Topic = {
  id: string;
  name: string;
  order?: number;
  coverImageUrl?: string;
  coverImageAlt?: string;
  category?: string;
  color?: string;
  createdAt?: Timestamp;
};

export type Content = {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  order?: number;
  coverImageUrl?: string;
  coverImageAlt?: string;
  estimatedDuration?: number; // em minutos
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt?: Timestamp;
};

export type Lesson = {
  id: string;
  contentId: string;
  title: string;
  youtubeUrl: string;
  order?: number;
  createdAt?: Timestamp;
  description?: string;
};

// Collection refs
const topicsCol = collection(db, 'topics');
const contentsCol = collection(db, 'contents');
const lessonsCol = collection(db, 'lessons');

// Create
export async function createTopic(data: Omit<Topic, 'id' | 'createdAt'>) {
  const payload = {
    ...data,
    order: data.order ?? 0,
    createdAt: serverTimestamp()
  };
  return addDoc(topicsCol, payload);
}

export async function createContent(data: Omit<Content, 'id' | 'createdAt'>) {
  const { description, ...rest } = data;
  const payload: DocumentData = { ...rest, createdAt: serverTimestamp() };
  if (typeof description === 'string' && description.trim().length > 0) {
    payload.description = description.trim();
  }
  return addDoc(contentsCol, payload);
}

export async function createLesson(data: Omit<Lesson, 'id' | 'createdAt'>) {
  return addDoc(lessonsCol, { ...data, createdAt: serverTimestamp() });
}

// Update
export async function updateTopic(id: string, patch: Partial<Omit<Topic, 'id'>>) {
  return updateDoc(doc(db, 'topics', id), patch as UpdateData<DocumentData>);
}

export async function updateContent(id: string, patch: Partial<Omit<Content, 'id'>>) {
  return updateDoc(doc(db, 'contents', id), patch as UpdateData<DocumentData>);
}

export async function updateLesson(id: string, patch: Partial<Omit<Lesson, 'id'>>) {
  return updateDoc(doc(db, 'lessons', id), patch as UpdateData<DocumentData>);
}

// Delete
export async function deleteTopic(id: string) {
  // Note: You may want cascading deletes; for now leave to caller
  return deleteDoc(doc(db, 'topics', id));
}

export async function deleteContent(id: string) {
  return deleteDoc(doc(db, 'contents', id));
}

export async function deleteLesson(id: string) {
  return deleteDoc(doc(db, 'lessons', id));
}

// Reorder helpers (persist `order` based on current index)
export async function reorderTopics(ids: string[]) {
  const batch = writeBatch(db);
  ids.forEach((id, index) => batch.update(doc(db, 'topics', id), { order: index } as UpdateData<DocumentData>));
  await batch.commit();
}

export async function reorderContents(ids: string[]) {
  const batch = writeBatch(db);
  ids.forEach((id, index) => batch.update(doc(db, 'contents', id), { order: index } as UpdateData<DocumentData>));
  await batch.commit();
}

export async function reorderLessons(ids: string[]) {
  const batch = writeBatch(db);
  ids.forEach((id, index) => batch.update(doc(db, 'lessons', id), { order: index } as UpdateData<DocumentData>));
  await batch.commit();
}

// Queries
export function listenTopics(cb: (items: Topic[]) => void) {
  const q = query(topicsCol, orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const items: Topic[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Topic));
    cb(items);
  });
}

export function listenContentsByTopic(topicId: string, cb: (items: Content[]) => void) {
  const q = query(contentsCol, where('topicId', '==', topicId), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const items: Content[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Content));
    cb(items);
  });
}

export function listenLessonsByContent(contentId: string, cb: (items: Lesson[]) => void) {
  const q = query(lessonsCol, where('contentId', '==', contentId), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const items: Lesson[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lesson));
    cb(items);
  });
}

export async function listAllTopics(): Promise<Topic[]> {
  const q = query(topicsCol, orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Topic));
}

export async function listContentsByTopic(topicId: string): Promise<Content[]> {
  const q = query(contentsCol, where('topicId', '==', topicId), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Content));
}

export async function listLessonsByContent(contentId: string): Promise<Lesson[]> {
  const q = query(lessonsCol, where('contentId', '==', contentId), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lesson));
}
