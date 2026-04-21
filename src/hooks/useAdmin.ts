import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
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
    const result = await signInWithPopup(auth, googleProvider);
    const authorizedProfile = getHardcodedAccountByUid(result.user.uid);

    if (!authorizedProfile) {
      setUser(result.user);
      setProfile(null);
      setAuthorizationError(getUnauthorizedMessage());
      return null;
    }

    setUser(result.user);
    setProfile(authorizedProfile);
    setAuthorizationError(null);
    return authorizedProfile;
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
