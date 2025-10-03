import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { createUserRecord, fetchUserRecord, listenUserRecord, type UserRecord } from '../lib/users';
import { AuthContext, type AuthContextValue } from './auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const listenerRef = useRef<Unsubscribe | null>(null);
  const previousProfileRef = useRef<UserRecord | null>(null);

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
        const suppressGuard = sessionStorage.getItem('adminRestoreInProgress') === '1';

        if (!record) {
          if (suppressGuard) {
            setLoading(true);
            return;
          }

          setProfile(null);
          setLoading(false);

          if (previousProfileRef.current) {
            void signOut(auth).catch((signOutError) => {
              console.error('Erro ao sair de usuário sem perfil', signOutError);
            });
          }

          previousProfileRef.current = null;
          return;
        }

        if (suppressGuard) {
          sessionStorage.removeItem('adminRestoreInProgress');
        }

        previousProfileRef.current = record;
        setProfile(record);

        if (record.isActive === false) {
          setLoading(false);
          void signOut(auth).catch((signOutError) => {
            console.error('Erro ao sair de usuário inativo', signOutError);
          });
        } else {
          setLoading(false);
        }
      });
    });

    return () => {
      unsubscribeAuth();
      listenerRef.current?.();
      previousProfileRef.current = null;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    loading,
    async signIn(email: string, password: string) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      let userRecord = await fetchUserRecord(credential.user.uid);

      if (!userRecord) {
        try {
          await createUserRecord({
            uid: credential.user.uid,
            email: credential.user.email ?? email,
            fullName: credential.user.displayName?.trim() || email,
            role: null,
            isActive: true,
          });
          userRecord = await fetchUserRecord(credential.user.uid);
        } catch (creationError) {
          await signOut(auth);
          const error = new Error('Perfil não encontrado e não foi possível criá-lo automaticamente. Contate um administrador.');
          (error as Error & { code?: string }).code = 'auth/user-profile-missing';
          throw error;
        }
      }

      if (!userRecord || userRecord.isActive === false) {
        await signOut(auth);
        const error = new Error(userRecord ? 'Conta desativada. Entre em contato com um administrador.' : 'Conta sem perfil configurado. Entre em contato com um administrador.');
        (error as Error & { code?: string }).code = userRecord ? 'auth/user-disabled' : 'auth/user-profile-missing';
        throw error;
      }
      previousProfileRef.current = userRecord;
    },
    async signOutUser() {
      await signOut(auth);
    },
  }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
