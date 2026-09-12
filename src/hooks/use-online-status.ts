'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * A tiny external store around the browser's online/offline events.
 *
 * Why a store instead of useState + an effect?
 * - useSyncExternalStore reads `navigator.onLine` at the right moments
 *   (after mount, on each event) without a setState-in-effect cascade.
 * - The listener set is shared, so N components using this hook attach
 *   exactly one pair of window listeners.
 */

interface OnlineState {
  isOnline: boolean;
  /** True after the browser came back online, until the UI acknowledges it. */
  wasOffline: boolean;
}

const INITIAL_STATE: OnlineState = { isOnline: true, wasOffline: false };

let state: OnlineState = INITIAL_STATE;
const listeners = new Set<() => void>();

function publish(next: OnlineState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function handleOnline() {
  publish({ isOnline: true, wasOffline: true });
}

function handleOffline() {
  publish({ isOnline: false, wasOffline: false });
}

function subscribe(onStoreChange: () => void) {
  if (listeners.size === 0) {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Sync with reality on first subscription; INITIAL_STATE assumed online
    // so the server render and hydration match.
    publish({ isOnline: navigator.onLine, wasOffline: false });
  }
  listeners.add(onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL_STATE;
}

export function useOnlineStatus() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const resetOfflineFlag = useCallback(() => {
    if (state.wasOffline) {
      publish({ ...state, wasOffline: false });
    }
  }, []);

  return { isOnline: current.isOnline, wasOffline: current.wasOffline, resetOfflineFlag };
}
