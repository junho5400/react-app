import { useState } from 'react';
import { signInWithGoogle, signOutUser, useAuth } from '../hooks/useAuth';

export const Banner = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setAuthError(`Sign-in failed: ${detail} Please try again.`);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    try {
      await signOutUser();
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setAuthError(`Sign-out failed: ${detail} Please try again.`);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        {loading ? (
          <p role="status" className="text-sm text-neutral-600">
            Loading account...
          </p>
        ) : isAuthenticated && user !== null ? (
          <>
            <p className="text-sm">Welcome, {user.displayName ?? user.email ?? 'scholar'}!</p>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <p className="text-sm">Welcome to the Course Scheduler! Sign in to edit courses.</p>
            <button
              type="button"
              onClick={() => void handleSignIn()}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
            >
              Sign In
            </button>
          </>
        )}
      </div>
      {authError !== null && (
        <p role="alert" className="text-sm font-normal text-red-600">
          {authError}
        </p>
      )}
    </div>
  );
};
