import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { useAuth } from './useAuth';
import { database } from '../utilities/firebase';

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;
  const [membership, setMembership] = useState<{
    uid: string;
    subscription: { active: boolean };
    isAdmin: boolean;
    error?: Error;
  }>();

  useEffect(() => {
    if (authLoading || uid === undefined) return;
    const subscription = { active: true };
    setMembership(undefined);
    const unsubscribe = onValue(
      ref(database, `/admins/${uid}`),
      (snapshot) => {
        if (subscription.active) {
          setMembership({ uid, subscription, isAdmin: snapshot.val() === true });
        }
      },
      (error) => {
        if (subscription.active) {
          setMembership({ uid, subscription, isAdmin: false, error });
        }
      },
    );
    return () => {
      subscription.active = false;
      unsubscribe();
    };
  }, [uid, authLoading]);

  // Scope the result to the current UID during render as well as in the effect:
  // an account change must deny access before the new subscription starts.
  const current =
    !authLoading && uid !== undefined && membership?.uid === uid && membership.subscription.active
      ? membership
      : undefined;
  const loading = authLoading || (uid !== undefined && current === undefined);
  return {
    user,
    isAdmin: !loading && current?.isAdmin === true && !current.error,
    loading,
    error: current?.error,
  };
};
