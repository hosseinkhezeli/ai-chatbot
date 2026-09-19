import { STRINGS } from '../constants';
import { getSafeNotificationUrl } from '../utils';

const sw = self as unknown as ServiceWorkerGlobalScope;

export function registerPush(): void {
  sw.addEventListener('push', (event: PushEvent) => {
    if (!event.data) {
      return;
    }

    let data: Record<string, unknown> = {};

    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore malformed push payloads.
    }

    const options: Record<string, unknown> = {
      body: (data.body as string) || STRINGS.pushDefaultBody,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [100, 50, 100],
      data: {
        url: getSafeNotificationUrl(data.url),
        messageId: data.messageId,
      },
      actions: [
        { action: 'open', title: STRINGS.notificationOpen },
        { action: 'dismiss', title: STRINGS.notificationDismiss },
      ],
      tag: 'chat-notification',
      renotify: true,
      requireInteraction: false,
    };

    event.waitUntil(
      sw.registration.showNotification(
        (data.title as string) || STRINGS.pushDefaultTitle,
        options,
      ),
    );
  });
}