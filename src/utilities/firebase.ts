import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref } from 'firebase/database';

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyCKo3yfTiUqRGvFWL3_D1iwTjMkuNwGE3U',
  authDomain: 'react-challenges-junho.firebaseapp.com',
  databaseURL: 'https://react-challenges-junho-default-rtdb.firebaseio.com',
  projectId: 'react-challenges-junho',
  storageBucket: 'react-challenges-junho.firebasestorage.app',
  messagingSenderId: '40519566610',
  appId: '1:40519566610:web:4d66bf514e92c4ff151fcb',
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);

export type DbDataResult<T> = [data: T | undefined, loading: boolean, error: Error | undefined];

export const useDbData = <T = unknown>(path: string): DbDataResult<T> => {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    setData(undefined);
    setLoading(true);
    setError(undefined);

    const unsubscribe = onValue(
      ref(database, path),
      (snapshot) => {
        const value = snapshot.val() as T | null | undefined;
        setData(value ?? undefined);
        setError(undefined);
        setLoading(false);
      },
      (databaseError: Error) => {
        setError(databaseError);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [path]);

  return [data, loading, error];
};
