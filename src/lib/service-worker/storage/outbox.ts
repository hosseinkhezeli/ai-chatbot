import { OUTBOX_STORE } from '../config';
import { openDB, transactionComplete } from './indexed-db';

export function getQueuedMessages(db: IDBDatabase): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, 'readonly');

    const store = transaction.objectStore(OUTBOX_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export function removeQueuedMessage(
  db: IDBDatabase,
  id: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, 'readwrite');

    const store = transaction.objectStore(OUTBOX_STORE);

    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(
        transaction.error ||
          new Error('IndexedDB transaction aborted'),
      );
    };
  });
}

export async function queueMessage(message: Record<string, unknown>): Promise<void> {
  if (!message?.id) {
    throw new Error('[SW] Cannot queue message without an id');
  }

  const db = await openDB();

  try {
    const transaction = db.transaction(OUTBOX_STORE, 'readwrite');

    const store = transaction.objectStore(OUTBOX_STORE);

    /*
     * `put` keeps queue writes idempotent when both the client and the SW
     * attempt to persist the same message.
     */
    store.put({
      ...message,
      queuedAt: Date.now(),
    });

    await transactionComplete(transaction);
  } finally {
    db.close();
  }
}