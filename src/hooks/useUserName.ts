import { useState } from 'react';

const USER_NAME_KEY = 'japanJourney_userName';

export const useUserName = () => {
  const [userName, setUserName] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(USER_NAME_KEY);
  });

  const saveUserName = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    window.localStorage.setItem(USER_NAME_KEY, trimmedName);
    setUserName(trimmedName);
  };

  return {
    userName,
    saveUserName,
    hasName: Boolean(userName),
  };
};
