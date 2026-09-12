'use client';

import { useEffect, useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

export function SWRegistration() {
  // Derived during render instead of set from an effect: whether the browser
  // supports service workers is knowable up front, not something we "learn".
  const [swSupported] = useState(
    () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  );
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { isInstalled, isInstallable, install, dismiss, hasPrompted } = usePWAInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Register service worker
  useEffect(() => {
    if (!swSupported) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Listen for messages from SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_SUCCESS') {
            console.log('[PWA] Background sync succeeded for message:', event.data.messageId);
          }
        });
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    };

    // Register after page load to not block initial render
    if (document.readyState === 'complete') {
      void registerSW();
      return;
    }

    const onLoad = () => void registerSW();
    window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, [swSupported]);

  // Reload exactly once when the new SW takes control, so the page's JS
  // matches the cache the replacement SW is now serving.
  useEffect(() => {
    if (!swSupported) return;

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, [swSupported]);

  // Show install banner after the user has engaged with the chat a bit.
  // Storage is read inside the effect (not during render), and the flag is
  // only set from the timer the effect owns.
  useEffect(() => {
    if (isInstalled || !isInstallable || hasPrompted) return;

    const messageCount = Number.parseInt(localStorage.getItem('chat-message-count') ?? '0', 10);
    if (messageCount < 2) return;

    const timer = setTimeout(() => {
      setShowInstallBanner(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isInstalled, isInstallable, hasPrompted]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowInstallBanner(false);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setShowInstallBanner(false);
  };

  const handleUpdate = () => {
    navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
  };

  if (!swSupported) return null;

  return (
    <>
      {/* Update Available Banner */}
      {updateAvailable && (
        <div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
          role="alert"
          aria-live="polite"
        >
          <div className="bg-background border border-border shadow-lg rounded-lg p-4 flex items-center gap-3">
            <svg className="h-5 w-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-sm flex-1">A new version is available.</span>
            <button
              onClick={handleUpdate}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              Update
            </button>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Install Banner */}
      {showInstallBanner && !isInstalled && (
        <div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40"
          role="dialog"
          aria-label="Install app"
        >
          <div className="bg-background border border-border shadow-lg rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium">Install AI Chatbot</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add to home screen for faster access and offline support.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 px-3 py-2 text-sm border border-border bg-background rounded hover:bg-muted transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
