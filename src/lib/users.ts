import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'admin' | null;

export interface UserRecord {
  id: string; // mirrors firebase uid
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserRecordInput {
  uid: string;
  email: string;
  fullName: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserRecordInput {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  email?: string;
}

const usersCollection = collection(db, 'users');

function toUserRecord(docSnap: QueryDocumentSnapshot<DocumentData>): UserRecord {
  const data = docSnap.data();
  const fullNameRaw = (data.fullName ?? '').trim();
  const emailRaw = (data.email ?? '').trim();
  const fullName = fullNameRaw || emailRaw;

  return {
    id: docSnap.id,
    uid: docSnap.id,
    email: emailRaw,
    fullName,
    role: (data.role ?? null) as UserRole,
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate?.(),
    updatedAt: data.updatedAt?.toDate?.(),
  };
}

function toUserRecordFromData(uid: string, data: DocumentData | undefined): UserRecord | null {
  if (!data) return null;
  const emailRaw = (data.email ?? '').trim();
  const fullName = (data.fullName ?? '').trim() || emailRaw;

  return {
    id: uid,
    uid,
    email: emailRaw,
    fullName,
    role: (data.role ?? null) as UserRole,
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate?.(),
    updatedAt: data.updatedAt?.toDate?.(),
  };
}

export async function createUserRecord(input: CreateUserRecordInput): Promise<void> {
  const userDoc = doc(usersCollection, input.uid);
  const payload: DocumentData = {
    uid: input.uid,
    email: input.email.trim(),
    fullName: input.fullName.trim(),
    role: input.role ?? null,
    isActive: input.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userDoc, payload);
}

export async function fetchUserRecord(uid: string): Promise<UserRecord | null> {
  const userDoc = doc(usersCollection, uid);
  const snap = await getDoc(userDoc);
  if (!snap.exists()) return null;
  return toUserRecordFromData(uid, snap.data());
}

export async function fetchAllUserRecords(): Promise<UserRecord[]> {
  const q = query(usersCollection, orderBy('fullName', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => toUserRecord(docSnap));
}

export function listenUserRecord(uid: string, cb: (user: UserRecord | null) => void): Unsubscribe {
  const ref = doc(usersCollection, uid);
  return onSnapshot(ref, (docSnap) => {
    if (!docSnap.exists()) {
      cb(null);
      return;
    }
    cb(toUserRecordFromData(uid, docSnap.data()));
  });
}

export function listenAllUserRecords(cb: (users: UserRecord[]) => void): Unsubscribe {
  const q = query(usersCollection, orderBy('fullName', 'asc'));
  return onSnapshot(q, (snap) => {
    const users = snap.docs.map((docSnap) => toUserRecord(docSnap));
    cb(users);
  });
}

export async function updateUserRecord(uid: string, input: UpdateUserRecordInput): Promise<void> {
  const userDoc = doc(usersCollection, uid);
  const partial: DocumentData = {
    ...input,
    updatedAt: serverTimestamp(),
  };
  if (input.fullName !== undefined) {
    partial.fullName = (input.fullName ?? '').trim();
  }
  if (input.email !== undefined) {
    partial.email = (input.email ?? '').trim();
  }
  await updateDoc(userDoc, partial);
}

export async function deleteUserRecord(uid: string): Promise<void> {
  const userDoc = doc(usersCollection, uid);
  await deleteDoc(userDoc);
}

export function normalizeRole(input: unknown): UserRole {
  if (input === 'admin') return 'admin';
  return null;
}
