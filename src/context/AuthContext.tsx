import { useMemo, useState } from 'react';
import { AuthContext, type AuthContextValue } from './auth';
import type { UserRecord } from '../lib/users';
import { changeUserPassword, verifyUserCredentials } from '../lib/users';
import { remoteLogout } from '../lib/remoteStore';

type ChallengeState = {
  question: string;
  answer: number;
  expiresAt: number;
};

type AttemptState = {
  count: number;
  challenge?: ChallengeState;
  lastAttempt: number;
};

type AuthError = Error & {
  code?: string;
  challenge?: { question: string };
};

const ATTEMPT_THRESHOLD = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const CHALLENGE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const attempts = new Map<string, AttemptState>();

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function createChallenge(): ChallengeState {
  const a = 10 + Math.floor(Math.random() * 40);
  const b = 10 + Math.floor(Math.random() * 40);
  const answer = a + b;
  return {
    question: `${a} + ${b}`,
    answer,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  };
}

function getAttemptState(username: string) {
  const key = normalizeUsername(username);
  const existing = attempts.get(key);
  if (!existing) {
    const state: AttemptState = { count: 0, lastAttempt: Date.now() };
    attempts.set(key, state);
    return { state, key };
  }

  const now = Date.now();
  if (now - existing.lastAttempt > ATTEMPT_WINDOW_MS) {
    existing.count = 0;
    existing.challenge = undefined;
  }
  existing.lastAttempt = now;

  if (existing.challenge && existing.challenge.expiresAt < now) {
    existing.challenge = undefined;
  }

  attempts.set(key, existing);
  return { state: existing, key };
}

function registerFailure(key: string, state: AttemptState) {
  state.count += 1;
  if (state.count >= ATTEMPT_THRESHOLD && !state.challenge) {
    state.challenge = createChallenge();
  }
  attempts.set(key, state);
}

function clearAttempts(key: string) {
  attempts.delete(key);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading] = useState(false);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signIn(username: string, password: string, challengeAnswer?: number) {
      const trimmedUsername = username.trim();
      const { state, key } = getAttemptState(trimmedUsername);

      if (state.count >= ATTEMPT_THRESHOLD) {
        if (!state.challenge) {
          state.challenge = createChallenge();
        }
        if (typeof challengeAnswer !== 'number' || Number.isNaN(challengeAnswer) || challengeAnswer !== state.challenge.answer) {
          const error = new Error('Responda ao desafio para continuar.') as AuthError;
          error.code = 'auth/challenge-required';
          error.challenge = { question: state.challenge.question };
          attempts.set(key, state);
          throw error;
        }
        state.challenge = undefined;
        attempts.set(key, state);
      }

      let account: UserRecord | null = null;
      try {
        account = await verifyUserCredentials(trimmedUsername, password);
      } catch (err) {
        registerFailure(key, state);
        throw err;
      }

      if (!account) {
        registerFailure(key, state);
        const error = new Error('Credenciais inválidas') as AuthError;
        error.code = 'auth/invalid-credentials';
        if (state.challenge) {
          error.challenge = { question: state.challenge.question };
        } else if (state.count >= ATTEMPT_THRESHOLD) {
          state.challenge = createChallenge();
          attempts.set(key, state);
          error.challenge = { question: state.challenge.question };
          error.code = 'auth/challenge-required';
        }
        throw error;
      }

      clearAttempts(key);
      setUser(account);
    },
    async signOut() {
      await remoteLogout().catch(() => undefined);
      setUser(null);
    },
    async changePassword(currentPassword: string, newPassword: string) {
      if (!user) {
        const error = new Error('Usuário não autenticado') as AuthError;
        error.code = 'auth/not-authenticated';
        throw error;
      }

      await changeUserPassword(user.uid, currentPassword, newPassword);
    },
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
