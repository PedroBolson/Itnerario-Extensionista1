import { createContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserRecord } from '../lib/users';

export type AuthContextValue = {
    user: User | null;
    profile: UserRecord | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOutUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
