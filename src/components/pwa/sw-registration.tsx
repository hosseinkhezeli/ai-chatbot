/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useEffect, useState } from 'react';

import { usePWAInstall } from '@/hooks/use-pwa-install';
import { fa } from '@/lib/i18n/fa';

function isServiceWorkerSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

interface UpdateBannerProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

function UpdateBanner({ onUpdate, onDismiss }: UpdateBannerProps) {
  return (
    <div
      className="fixed bottom-4 start-4 end-4 z-50 md:start-auto md:end-4 md:w-96"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 shadow-lg">
        <svg
          className="h-5 w-5 shrink-0 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>

        <span className="flex-1 text-sm">{fa.pwa.updateAvailable}</span>

        <button
          type="button"
          onClick={onUpdate}
          className="shrink-0 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {fa.pwa.update}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
          aria-label={fa.pwa.dismissUpdate}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface InstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

function InstallBanner({ onInstall, onDismiss }: InstallBannerProps) {
  return (
    <div
      className="fixed bottom-4 start-4 end-4 z-40 md:start-auto md:end-4 md:w-96"
      role="dialog"
      aria-label={fa.pwa.installDialogTitle}
    >
      <div className="rounded-lg border border-border bg-background p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium">{fa.pwa.installTitle}</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {fa.pwa.installDescription}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onInstall}
            className="flex-1 rounded bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {fa.pwa.install}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            {fa.pwa.notNow}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SWRegistration() {
  const { isInstalled, isInstallable, install, dismiss, hasPrompted } = usePWAInstall();

  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  /*
   * Service worker lifecycle.
   *
   * IMPORTANT:
   * Never register the service worker during development.
   * Next.js/Turbopack development chunks must not be
   * intercepted by a persistent service worker cache.
   */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !isServiceWorkerSupported()) {
      return;
    }

    let cancelled = false;
    let updateFoundCleanup: (() => void) | undefined;

    async function registerServiceWorker() {
      try {
        const swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        if (cancelled) {
          return;
        } 

        setRegistration(swRegistration);

        const handleUpdateFound = () => {
          const newWorker = swRegistration.installing;

          if (!newWorker) {
            return;
          }

          const handleStateChange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          };

          newWorker.addEventListener('statechange', handleStateChange);

          updateFoundCleanup = () => {
            newWorker.removeEventListener('statechange', handleStateChange);
          };
        };

        swRegistration.addEventListener('updatefound', handleUpdateFound);

        /*
         * The worker may already be waiting when
         * registration resolves, particularly after
         * a browser restart.
         */
        if (swRegistration.waiting) {
          setUpdateAvailable(true);
        }
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    }

    if (document.readyState === 'complete') {
      void registerServiceWorker();
    } else {
      const handleLoad = () => {
        void registerServiceWorker();
      };

      window.addEventListener('load', handleLoad, {
        once: true,
      });

      return () => {
        cancelled = true;
        updateFoundCleanup?.();
        window.removeEventListener('load', handleLoad);
      };
    }

    return () => {
      cancelled = true;
      updateFoundCleanup?.();
    };
  }, []);

  /*
   * Listen for messages from the service worker.
   */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !isServiceWorkerSupported()) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'SYNC_SUCCESS') {
        return;
      }

      console.debug('[PWA] Background sync succeeded:', event.data.messageId);
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  /*
   * Reload once when the new worker takes control.
   */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !isServiceWorkerSupported()) {
      return;
    }

    let refreshing = false;

    const handleControllerChange = () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  /*
   * Show install prompt after at least two chat messages.
   *
   * This remains available in development because it only
   * controls the install UI. The actual service worker
   * registration above is production-only.
   */
  useEffect(() => {
    if (isInstalled || !isInstallable || hasPrompted) {
      setShowInstallBanner(false);
      return;
    }

    const messageCount = Number.parseInt(
      window.localStorage.getItem('chat-message-count') ?? '0',
      10,
    );

    if (messageCount < 2) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowInstallBanner(true);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isInstalled, isInstallable, hasPrompted]);

  const handleInstall = useCallback(async () => {
    const success = await install();

    if (success) {
      setShowInstallBanner(false);
    }
  }, [install]);

  const handleDismissInstall = useCallback(() => {
    dismiss();
    setShowInstallBanner(false);
  }, [dismiss]);

  const handleUpdate = useCallback(() => {
    const waitingWorker = registration?.waiting;

    if (!waitingWorker) {
      setUpdateAvailable(false);
      return;
    }

    waitingWorker.postMessage({
      type: 'SKIP_WAITING',
    });
  }, [registration]);

  const handleDismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  if (!isServiceWorkerSupported()) {
    return null;
  }

  return (
    <>
      {updateAvailable && <UpdateBanner onUpdate={handleUpdate} onDismiss={handleDismissUpdate} />}

      {showInstallBanner && !isInstalled && (
        <InstallBanner onInstall={handleInstall} onDismiss={handleDismissInstall} />
      )}
    </>
  );
}
