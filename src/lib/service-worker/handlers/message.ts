import { MESSAGE_TYPES, STRINGS } from '../constants';
import { queueMessageForSync, retryQueueManually } from './sync';

const sw = self as unknown as ServiceWorkerGlobalScope;

export function registerMessage(): void {
  sw.addEventListener('message', (event: ExtendableMessageEvent) => {
    const data = event.data;

    if (!data?.type) {
      return;
    }

    if (data.type === MESSAGE_TYPES.SKIP_WAITING) {
      void sw.skipWaiting();
      return;
    }

    if (data.type === MESSAGE_TYPES.QUEUE_MESSAGE) {
      event.waitUntil(queueMessageForSync(data.message));
      return;
    }

    if (data.type === MESSAGE_TYPES.RETRY_QUEUE) {
      event.waitUntil(retryQueueManually());
      return;
    }

    if (data.type === MESSAGE_TYPES.NOTIFY_COMPLETION) {
      if (!data.background) {
        return;
      }

      const options: Record<string, unknown> = {
        body: data.preview || STRINGS.responseReadyBody,
        icon: '/icons/icon-192.png',
        tag: 'chat-completion',
        renotify: true,
        data: {
          url: '/',
          conversationId: data.conversationId,
        },
      };

      event.waitUntil(
        sw.registration.showNotification(STRINGS.responseReadyTitle, options),
      );
    }
  });
}