'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STANDALONE_QUERY = '(display-mode: standalone)';

// Subscribes to the display-mode media query so "is the app running installed"
// is a real external store, not a value we poll in an effect.
function subscribeStandalone(onChange: () => void) {
  const mediaQuery = window.matchMedia(STANDALONE_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getIsStandalone() {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// Server snapshot: false. During hydration the client also reports false, then
// useSyncExternalStore re-reads the real value after mount.
function getIsStandaloneServer() {
  return false;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const isInstalledStandalone = useSyncExternalStore(
    subscribeStandalone,
    getIsStandalone,
    getIsStandaloneServer,
  );

  // Track whether we've offered the prompt this session (used to gate the
  // banner). The event listener below is the only thing that sets it.
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the browser's own mini-infobar so we control the UX.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      setDeferredPrompt(null);
      setHasPrompted(true);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
    setIsInstallable(false);
    setHasPrompted(true);
  }, []);

  return {
    isInstallable,
    isInstalled: isInstalledStandalone,
    hasPrompted,
    install,
    dismiss,
    canPrompt: !hasPrompted,
  };
}
