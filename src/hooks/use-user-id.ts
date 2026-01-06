'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'creator-sync-user-id';
const DEFAULT_USER_ID = 'user_123';

const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

const handleStorage = (event: StorageEvent) => {
  if (event.key === STORAGE_KEY) {
    notify();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
};

const getSnapshot = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_ID;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored ?? DEFAULT_USER_ID;
};

export const useUserId = () => {
  const userId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => DEFAULT_USER_ID,
  );

  const updateUserId = (value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
    notify();
  };

  return { userId, setUserId: updateUserId };
};
