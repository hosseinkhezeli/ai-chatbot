import { SYNC_TAG } from '../config';
import { MESSAGE_TYPES } from '../constants';
import { openDB } from '../storage/indexed-db';
import {
  getQueuedMessages,
  removeQueuedMessage,
  queueMessage,
} from '../storage/outbox';

const sw = self as unknown as ServiceWorkerGlobalScope;

interface QueuedMessage {
  id: string;
  [key: string]: unknown;
}

async function broadcastMessage(message: object): Promise<void> {
  const clients = await sw.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage(message);
  }
}

async function retryQueuedMessages(): Promise<void> {
  let db: IDBDatabase | null = null;
  let hasTransientFailure = false;

  try {
    db = await openDB();
    const messages = await getQueuedMessages(db);

    for (const message of messages) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            /*
             * `/api/chat` should treat this identifier as an idempotency
             * key so a retry cannot create the same message twice.
             */
            'Idempotency-Key': (message as QueuedMessage).id,
          },
          body: JSON.stringify(message),
        });

        /*
         * Consume the complete response before considering the outbox item
         * delivered. The chat endpoint is streaming.
         */
        if (response.ok) {
          await response.text();
          await removeQueuedMessage(db, (message as QueuedMessage).id);
          await broadcastMessage({
            type: MESSAGE_TYPES.SYNC_SUCCESS,
            messageId: (message as QueuedMessage).id,
          });
          continue;
        }

        /*
         * These responses should not cause permanent deletion from the
         * outbox because the failure may be temporary.
         */
        if (response.status === 429 || response.status >= 500) {
          hasTransientFailure = true;
          continue;
        }

        /*
         * Permanent client-side failures should not retry forever.
         */
        await removeQueuedMessage(db, (message as QueuedMessage).id);
        await broadcastMessage({
          type: MESSAGE_TYPES.SYNC_FAILED,
          messageId: (message as QueuedMessage).id,
          status: response.status,
        });
      } catch (error) {
        console.warn('[SW] Chat sync failed:', (message as QueuedMessage).id, error);
        hasTransientFailure = true;
      }
    }

    /*
     * Supporting browsers use rejection as the signal that the sync work
     * did not finish and should be retried.
     */
    if (hasTransientFailure) {
      throw new Error('Transient chat sync failure');
    }
  } finally {
    db?.close();
  }
}

export function registerSync(): void {
  sw.addEventListener('sync', (event: SyncEvent) => {
    if (event.tag !== SYNC_TAG) {
      return;
    }

    event.waitUntil(retryQueuedMessages());
  });
}

export async function queueMessageForSync(message: QueuedMessage): Promise<void> {
  await queueMessage(message);

  /*
   * Background Sync is an enhancement. IndexedDB remains the source of
   * truth when SyncManager is unavailable.
   */
  // sync is not in standard ServiceWorkerRegistration but works in browsers
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const syncManager = sw.registration.sync as SyncManager | undefined;
  if (syncManager) {
    try {
      await syncManager.register(SYNC_TAG);
    } catch (error) {
      console.warn('[SW] Background Sync unavailable:', error);
    }
  }
}

export async function retryQueueManually(): Promise<void> {
  try {
    await retryQueuedMessages();
  } catch (error) {
    console.warn('[SW] Manual queue retry failed:', error);
  }
}