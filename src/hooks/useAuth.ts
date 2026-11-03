import { useEffect, useState } from 'react';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
// Ensures the Firebase app is initialized before getAuth() is used.
import '../utilities/firebase';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, isAuthenticated: user !== null, loading };
};

export const signInWithGoogle = async (): Promise<void> => {
  await signInWithPopup(getAuth(), new GoogleAuthProvider());
};

export const signOutUser = async (): Promise<void> => {
  await signOut(getAuth());
};
