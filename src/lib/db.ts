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
} from 'firebase/firestore';
import { db } from './firebase';

export type Topic = {
  id: string;
  name: string;
  order?: number;
  createdAt?: any;
};

export type Content = {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  order?: number;
  createdAt?: any;
};

export type Lesson = {
  id: string;
  contentId: string;
  title: string;
  youtubeUrl: string;
  order?: number;
  createdAt?: any;
};

// Collection refs
const topicsCol = collection(db, 'topics');
const contentsCol = collection(db, 'contents');
const lessonsCol = collection(db, 'lessons');

// Create
export async function createTopic(name: string, order?: number) {
  return addDoc(topicsCol, { name, order: order ?? 0, createdAt: serverTimestamp() });
}

export async function createContent(data: Omit<Content, 'id' | 'createdAt'>) {
  const { description, ...rest } = data as any;
  const payload: any = { ...rest, createdAt: serverTimestamp() };
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
  return updateDoc(doc(db, 'topics', id), patch as any);
}

export async function updateContent(id: string, patch: Partial<Omit<Content, 'id'>>) {
  return updateDoc(doc(db, 'contents', id), patch as any);
}

export async function updateLesson(id: string, patch: Partial<Omit<Lesson, 'id'>>) {
  return updateDoc(doc(db, 'lessons', id), patch as any);
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
  ids.forEach((id, index) => batch.update(doc(db, 'topics', id), { order: index } as any));
  await batch.commit();
}

export async function reorderContents(ids: string[]) {
  const batch = writeBatch(db);
  ids.forEach((id, index) => batch.update(doc(db, 'contents', id), { order: index } as any));
  await batch.commit();
}

export async function reorderLessons(ids: string[]) {
  const batch = writeBatch(db);
  ids.forEach((id, index) => batch.update(doc(db, 'lessons', id), { order: index } as any));
  await batch.commit();
}

// Queries
export function listenTopics(cb: (items: Topic[]) => void) {
  const q = query(topicsCol, orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const items: Topic[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(items);
  });
}

export function listenContentsByTopic(topicId: string, cb: (items: Content[]) => void) {
  const q = query(contentsCol, where('topicId', '==', topicId), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const items: Content[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(items);
  });
}

export function listenLessonsByContent(contentId: string, cb: (items: Lesson[]) => void) {
  const q = query(lessonsCol, where('contentId', '==', contentId), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const items: Lesson[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(items);
  });
}

export async function listAllTopics(): Promise<Topic[]> {
  const q = query(topicsCol, orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function listContentsByTopic(topicId: string): Promise<Content[]> {
  const q = query(contentsCol, where('topicId', '==', topicId), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function listLessonsByContent(contentId: string): Promise<Lesson[]> {
  const q = query(lessonsCol, where('contentId', '==', contentId), orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
