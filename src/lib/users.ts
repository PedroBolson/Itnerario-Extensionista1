import {
  findUserByEmail,
  findUserById,
  insertUser,
  listUsers,
  patchUser,
  removeUser,
  setUserPassword,
  subscribeUsers,
  verifyPassword,
} from './memoryStore';
import { hydrateFromRemote } from './remoteSync';
import {
  isBackendAvailable,
  remoteChangePassword,
  remoteCreateRecord,
  remoteDeleteRecord,
  remoteLogin,
  remoteUpdateRecord,
} from './remoteStore';
import type { UserRecord, UserRole } from './types';

export type { UserRecord, UserRole } from './types';

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  email?: string;
}

export function normalizeRole(input: unknown): UserRole {
  return input === 'admin' ? 'admin' : 'user';
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  if (!input.email.trim()) throw new Error('Email é obrigatório');
  if (input.password.length < 6) throw new Error('Senha deve ter pelo menos 6 caracteres');

  const existing = findUserByEmail(input.email);
  if (existing) {
    throw new Error('Já existe um usuário com este email');
  }

  if (isBackendAvailable()) {
    const uid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    await remoteCreateRecord('users', {
      uid,
      email: input.email.trim(),
      fullName: input.fullName.trim() || input.email.trim(),
      role: input.role ?? 'user',
      isActive: input.isActive ?? true,
      password: input.password,
    });
    await hydrateFromRemote();
    const refreshed = findUserById(uid) ?? findUserByEmail(input.email.trim());
    if (!refreshed) throw new Error('Não foi possível localizar o usuário recém-criado.');
    const { passwordHash, ...user } = refreshed;
    return user;
  }

  const record = insertUser({
    email: input.email.trim(),
    fullName: input.fullName.trim() || input.email.trim(),
    password: input.password,
    role: input.role ?? 'user',
    isActive: input.isActive ?? true,
  });

  const { passwordHash, ...user } = record;
  return user;
}

export async function fetchUser(uid: string): Promise<UserRecord | null> {
  const record = findUserById(uid);
  if (!record) return null;
  const { passwordHash, ...user } = record;
  return user;
}

export async function fetchAllUsers(): Promise<UserRecord[]> {
  return listUsers();
}

export function listenAllUsers(cb: (users: UserRecord[]) => void) {
  return subscribeUsers(cb);
}

export async function updateUser(uid: string, input: UpdateUserInput) {
  const patch: UpdateUserInput = {};
  if (input.fullName !== undefined) {
    patch.fullName = input.fullName.trim();
  }
  if (input.email !== undefined) {
    patch.email = input.email.trim();
  }
  if (input.role !== undefined) {
    patch.role = input.role;
  }
  if (input.isActive !== undefined) {
    patch.isActive = input.isActive;
  }
  patchUser(uid, patch as Partial<UserRecord>);

  if (isBackendAvailable()) {
    await remoteUpdateRecord('users', uid, { ...patch } as Record<string, unknown>);
    await hydrateFromRemote();
  }
}

export async function deleteUser(uid: string) {
  removeUser(uid);
  if (isBackendAvailable()) {
    await remoteDeleteRecord('users', uid);
    await hydrateFromRemote();
  }
}

export async function changeUserPassword(uid: string, currentPassword: string, newPassword: string) {
  if (newPassword.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres');
  }

  if (isBackendAvailable()) {
    await remoteChangePassword(currentPassword, newPassword);
    setUserPassword(uid, newPassword);
    await hydrateFromRemote();
    return;
  }

  const record = findUserById(uid);
  if (!record) throw new Error('Usuário não encontrado');
  const isValid = record.passwordHash
    ? await verifyPassword(record.passwordHash, currentPassword)
    : false;
  if (!isValid) throw new Error('Senha atual incorreta');
  setUserPassword(uid, newPassword);
}

export async function verifyUserCredentials(email: string, password: string): Promise<UserRecord | null> {
  if (isBackendAvailable()) {
    const actor = (await remoteLogin(email.trim().toLowerCase(), password)) as
      | { uid?: string }
      | null;
    await hydrateFromRemote();
    const uid = actor && typeof actor.uid === 'string' ? actor.uid : undefined;
    if (uid) {
      const user = findUserById(uid);
      if (user) {
        const { passwordHash, ...rest } = user;
        return rest;
      }
    }
    return null;
  } const record = findUserByEmail(email);
  if (!record) return null;

  const isValid = record.passwordHash ? await verifyPassword(record.passwordHash, password) : false;
  if (!isValid) return null;

  if (!record.isActive) {
    const error = new Error('Conta desativada. Contate um administrador.');
    (error as Error & { code?: string }).code = 'auth/user-disabled';
    throw error;
  }

  const { passwordHash, ...user } = record;
  return user;
}

export async function verifyCurrentPassword(uid: string, password: string): Promise<boolean> {
  if (isBackendAvailable()) {
    try {
      const user = findUserById(uid);
      if (!user) return false;
      await remoteLogin(user.email, password);
      await hydrateFromRemote();
      return true;
    } catch {
      return false;
    }
  }

  const record = findUserById(uid);
  if (!record) return false;
  return record.passwordHash ? verifyPassword(record.passwordHash, password) : false;
}
