'use client';

import { useState, useEffect, useCallback } from 'react';

import { fa } from '@/lib/i18n/fa';

interface NotificationOptions {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
  icon?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface ServiceWorkerNotificationOptions {
  body: string;
  icon: string;
  badge: string;
  tag: string;
  data?: Record<string, unknown>;
  requireInteraction: boolean;
  silent: boolean;
  vibrate: number[];
  actions: Array<{ action: string; title: string }>;
}

let notificationPermission: NotificationPermission = 'default';
let swRegistration: ServiceWorkerRegistration | null = null;

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  // `supported` and `permission` start conservative (matching the server
  // render) and are only set from async/event callbacks below — never
  // synchronously in the effect body.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    // Get SW registration; readiness also means showNotification will work.
    navigator.serviceWorker.ready.then((reg) => {
      swRegistration = reg;
      setSupported(true);
      setPermission(Notification.permission);
    });

    // Permission can change via browser site-settings UI with no event we can
    // subscribe to, so re-read it whenever the tab regains attention.
    const syncPermission = () => {
      notificationPermission = Notification.permission;
      setPermission(notificationPermission);
    };
    document.addEventListener('visibilitychange', syncPermission);
    return () => document.removeEventListener('visibilitychange', syncPermission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;

    try {
      const perm = await Notification.requestPermission();
      notificationPermission = perm;
      setPermission(perm);
      return perm === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }, [supported]);

  const showNotification = useCallback(async (options: NotificationOptions) => {
    if (!supported || notificationPermission !== 'granted') {
      return false;
    }

    try {
      // Try to show via Service Worker first (works when app is backgrounded)
      if (swRegistration) {
        await swRegistration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag: options.tag || 'chat-notification',
          data: options.data,
          requireInteraction: options.requireInteraction ?? false,
          silent: options.silent ?? false,
          // vibrate/actions are valid SW notification options but missing
          // from the TS DOM lib's NotificationOptions type
          vibrate: [100, 50, 100],
          actions: [
            { action: 'open', title: fa.pwa.notificationOpen },
            { action: 'dismiss', title: fa.pwa.notificationDismiss },
          ],
        } as unknown as ServiceWorkerNotificationOptions);
        return true;
      }

      // Fallback to regular Notification API
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192.png',
        tag: options.tag || 'chat-notification',
        data: options.data,
        requireInteraction: options.requireInteraction ?? false,
        silent: options.silent ?? false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }, [supported]);

  const notifyCompletion = useCallback(async (
    preview: string,
    conversationId?: string
  ) => {
    // Only notify if app is not focused/visible
    if (document.visibilityState === 'visible') {
      return false;
    }

    return showNotification({
      title: fa.pwa.responseReadyTitle,
      body: preview.length > 100 ? preview.slice(0, 100) + '…' : preview,
      tag: 'chat-completion',
      data: { conversationId, url: '/' },
      requireInteraction: false,
    });
  }, [showNotification]);

  return {
    supported,
    permission,
    requestPermission,
    showNotification,
    notifyCompletion,
  };
}