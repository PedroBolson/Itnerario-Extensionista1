import { createContext } from 'react';
import type { UserRecord } from '../lib/users';

export type LoginChallenge = {
  question: string;
};

export type AuthContextValue = {
  user: UserRecord | null;
  loading: boolean;
  signIn: (username: string, password: string, challengeAnswer?: number) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
