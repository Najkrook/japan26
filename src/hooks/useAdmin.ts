import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithRedirect, getRedirectResult, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { getHardcodedAccountByUid } from '../config/hardcodedAccounts';
import type { HardcodedAccountProfile, UserRole } from '../types';

const getUnauthorizedMessage = (): string =>
  'Kontot \u00e4r inloggat men saknar uppladdnings- och adminbeh\u00f6righet. Bes\u00f6kare kan fortfarande titta och kommentera utan att logga in.';

export const useAdmin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<HardcodedAccountProfile | null>(null);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the user is returning from a Google redirect login
    getRedirectResult(auth).catch(() => {
      // Silently ignore redirect errors — onAuthStateChanged handles the rest
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setAuthorizationError(null);
        setLoading(false);
        return;
      }

      const authorizedProfile = getHardcodedAccountByUid(firebaseUser.uid);

      if (!authorizedProfile) {
        setUser(firebaseUser);
        setProfile(null);
        setAuthorizationError(getUnauthorizedMessage());
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setProfile(authorizedProfile);
      setAuthorizationError(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<HardcodedAccountProfile | null> => {
    // Redirect the entire page to Google's login — no popup needed
    await signInWithRedirect(auth, googleProvider);
    // This line is never reached; the page navigates away.
    // When the user returns, onAuthStateChanged fires automatically.
    return null;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setAuthorizationError(null);
  };

  const role: UserRole | null = profile?.role ?? null;
  const isAdmin = role === 'admin';
  const canPost = isAdmin || role === 'poster';

  return {
    user,
    profile,
    role,
    loading,
    isAdmin,
    canPost,
    authorizationError,
    loginWithGoogle,
    logout,
  };
};
