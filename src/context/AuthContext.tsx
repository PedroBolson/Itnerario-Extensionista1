import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { fetchUserRecord, listenUserRecord, type UserRecord } from '../lib/users';
import { AuthContext, type AuthContextValue } from './auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const listenerRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      listenerRef.current?.();
      listenerRef.current = null;

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setLoading(true);

      listenerRef.current = listenUserRecord(firebaseUser.uid, (record) => {
        setProfile(record);
        if (!record || record.isActive === false) {
          setLoading(false);
          void signOut(auth).catch((signOutError) => {
            console.error('Erro ao sair de usuário inativo ou sem perfil', signOutError);
          });
        } else {
          setLoading(false);
        }
      });
    });

    return () => {
      unsubscribeAuth();
      listenerRef.current?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    async signIn(email: string, password: string) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userRecord = await fetchUserRecord(credential.user.uid);
      if (!userRecord) {
        await signOut(auth);
        const error = new Error('Conta sem perfil configurado. Entre em contato com um administrador.');
        (error as Error & { code?: string }).code = 'auth/user-profile-missing';
        throw error;
      }
      if (!userRecord.isActive) {
        await signOut(auth);
        const error = new Error('Conta desativada. Entre em contato com um administrador.');
        (error as Error & { code?: string }).code = 'auth/user-disabled';
        throw error;
      }
    },
    async signOutUser() {
      await signOut(auth);
    },
  }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
