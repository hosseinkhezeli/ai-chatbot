/**
 * Service Worker for AI Chatbot PWA
 *
 * Caching Strategy:
 * - Next.js assets (/_next/*): NEVER intercepted
 * - Static assets: Cache First
 * - GET /api/*: Network First with cache fallback
 * - POST /api/*: Network only, never Cache Storage
 * - Navigation: Stale While Revalidate
 * - Offline chat messages: IndexedDB + Background Sync
 */

const CACHE_NAME = 'ai-chatbot-v1';
const STATIC_CACHE = 'ai-chatbot-static-v1';
const API_CACHE = 'ai-chatbot-api-v1';

const OFFLINE_URL = '/offline.html';

/* -------------------------------------------------------------------------- */
/* Pre-cache                                                                  */
/* -------------------------------------------------------------------------- */

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

/* -------------------------------------------------------------------------- */
/* Matching                                                                   */
/* -------------------------------------------------------------------------- */

const STATIC_PATTERNS = [
  /\/fonts\//,
  /\/icons\//,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
  /\.(?:js|css)$/,
];

const API_PATTERNS = [
  /^\/api\//,
];

function matchesPattern(request, patterns) {
  const url = new URL(request.url);

  return patterns.some((pattern) =>
    pattern.test(url.pathname),
  );
}

/* -------------------------------------------------------------------------- */
/* Cache strategies                                                           */
/* -------------------------------------------------------------------------- */

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (
      networkResponse.ok &&
      request.method === 'GET'
    ) {
      await cache.put(
        request,
        networkResponse.clone(),
      );
    }

    return networkResponse;
  } catch (error) {
    console.error(
      '[SW] Cache first failed:',
      error,
    );

    throw error;
  }
}

/**
 * GET API:
 *   Network → cache fallback
 *
 * POST API:
 *   Network only
 *
 * POST requests must NEVER be passed to cache.put().
 */
async function apiRequest(request) {
  const isGet = request.method === 'GET';

  if (!isGet) {
    try {
      return await fetch(request);
    } catch (error) {
      console.log(
        '[SW] API request failed:',
        request.method,
        request.url,
      );

      if (
        request.method === 'POST' &&
        request.url.includes('/api/chat')
      ) {
        return new Response(
          JSON.stringify({
            error: 'Offline',
            message:
              'You are offline. Your message will be sent when the connection returns.',
            offline: true,
          }),
          {
            status: 503,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Offline',
          offline: true,
        }),
        {
          status: 503,
          headers: {
            'Content-Type':
              'application/json',
          },
        },
      );
    }
  }

  const cache =
    await caches.open(API_CACHE);

  try {
    const networkResponse =
      await fetch(request);

    if (networkResponse.ok) {
      await cache.put(
        request,
        networkResponse.clone(),
      );
    }

    return networkResponse;
  } catch (error) {
    console.log(
      '[SW] GET API failed, trying cache:',
      request.url,
    );

    const cachedResponse =
      await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({
        error: 'Offline',
        offline: true,
      }),
      {
        status: 503,
        headers: {
          'Content-Type':
            'application/json',
        },
      },
    );
  }
}

async function staleWhileRevalidate(
  request,
) {
  const cache =
    await caches.open(CACHE_NAME);

  const cachedResponse =
    await cache.match(request);

  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (
        networkResponse.ok &&
        request.method === 'GET'
      ) {
        await cache.put(
          request,
          networkResponse.clone(),
        );
      }

      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

/* -------------------------------------------------------------------------- */
/* Install                                                                    */
/* -------------------------------------------------------------------------- */

self.addEventListener(
  'install',
  (event) => {
    console.log('[SW] Installing...');

    event.waitUntil(
      caches
        .open(STATIC_CACHE)
        .then((cache) => {
          console.log(
            '[SW] Pre-caching static assets',
          );

          return cache.addAll(
            PRECACHE_ASSETS,
          );
        })
        .then(() => {
          console.log(
            '[SW] Pre-cache complete',
          );

          return self.skipWaiting();
        }),
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Activate                                                                   */
/* -------------------------------------------------------------------------- */

self.addEventListener(
  'activate',
  (event) => {
    console.log('[SW] Activating...');

    const activeCaches = new Set([
      CACHE_NAME,
      STATIC_CACHE,
      API_CACHE,
    ]);

    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter(
                (name) =>
                  !activeCaches.has(name),
              )
              .map((name) => {
                console.log(
                  '[SW] Deleting old cache:',
                  name,
                );

                return caches.delete(name);
              }),
          ),
        )
        .then(() =>
          self.clients.claim(),
        )
        .then(() => {
          console.log('[SW] Activated');
        }),
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Fetch                                                                      */
/* -------------------------------------------------------------------------- */

self.addEventListener(
  'fetch',
  (event) => {
    const { request } = event;

    if (
      !['GET', 'POST'].includes(
        request.method,
      )
    ) {
      return;
    }

    const url = new URL(
      request.url,
    );

    if (
      !['http:', 'https:'].includes(
        url.protocol,
      )
    ) {
      return;
    }

    if (
      url.origin !== location.origin &&
      !url.hostname.includes(
        'fonts.googleapis.com',
      ) &&
      !url.hostname.includes(
        'fonts.gstatic.com',
      )
    ) {
      return;
    }

    /*
     * CRITICAL:
     *
     * Never intercept Next.js internal assets.
     * This includes Turbopack development chunks
     * under /.next/ and production assets under
     * /_next/.
     *
     * Next.js must control these requests directly.
     */
    if (
      url.origin === location.origin &&
      url.pathname.startsWith('/_next/')
    ) {
      return;
    }

    /*
     * Static assets should only be cached for GET requests.
     */
    if (
      request.method === 'GET' &&
      matchesPattern(
        request,
        STATIC_PATTERNS,
      )
    ) {
      event.respondWith(
        cacheFirst(request),
      );

      return;
    }

    /*
     * API:
     * - GET -> network first
     * - POST -> network only
     */
    if (
      matchesPattern(
        request,
        API_PATTERNS,
      )
    ) {
      event.respondWith(
        apiRequest(request),
      );

      return;
    }

    /*
     * Navigation requests are always GET.
     */
    if (
      request.method === 'GET' &&
      (request.mode === 'navigate' ||
        url.pathname === '/' ||
        !url.pathname.startsWith(
          '/api/',
        ))
    ) {
      event.respondWith(
        staleWhileRevalidate(request).catch(
          async () => {
            const offlinePage =
              await caches.match(
                OFFLINE_URL,
              );

            return (
              offlinePage ||
              new Response(
                'Offline',
                {
                  status: 503,
                  headers: {
                    'Content-Type':
                      'text/plain',
                  },
                },
              )
            );
          },
        ),
      );
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Background Sync                                                            */
/* -------------------------------------------------------------------------- */

self.addEventListener(
  'sync',
  (event) => {
    if (event.tag !== 'chat-sync') {
      return;
    }

    console.log(
      '[SW] Background sync: chat-sync',
    );

    event.waitUntil(
      retryQueuedMessages(),
    );
  },
);

async function retryQueuedMessages() {
  let db;

  try {
    db = await openDB();

    const messages =
      await getQueuedMessages(db);

    for (const message of messages) {
      try {
        const response =
          await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify(message),
          });

        if (!response.ok) {
          console.warn(
            '[SW] Chat sync returned:',
            response.status,
            message.id,
          );

          continue;
        }

        await removeQueuedMessage(
          db,
          message.id,
        );

        console.log(
          '[SW] Synced message:',
          message.id,
        );

        const clients =
          await self.clients.matchAll();

        for (const client of clients) {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            messageId: message.id,
          });
        }
      } catch (error) {
        console.error(
          '[SW] Failed to sync message:',
          message.id,
          error,
        );
      }
    }
  } catch (error) {
    console.error(
      '[SW] Background sync failed:',
      error,
    );
  } finally {
    db?.close();
  }
}

/* -------------------------------------------------------------------------- */
/* Push notifications                                                         */
/* -------------------------------------------------------------------------- */

self.addEventListener(
  'push',
  (event) => {
    console.log('[SW] Push received');

    if (!event.data) {
      return;
    }

    const data = event.data.json();

    const options = {
      body:
        data.body ||
        'New message received',

      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',

      vibrate: [100, 50, 100],

      data: {
        url: data.url || '/',
        messageId: data.messageId,
      },

      actions: [
        {
          action: 'open',
          title: 'Open',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],

      tag: 'chat-notification',
      renotify: true,
      requireInteraction: false,
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'AI Chatbot',
        options,
      ),
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Notification click                                                         */
/* -------------------------------------------------------------------------- */

self.addEventListener(
  'notificationclick',
  (event) => {
    console.log(
      '[SW] Notification clicked:',
      event.action,
    );

    event.notification.close();

    if (event.action === 'dismiss') {
      return;
    }

    const url =
      event.notification.data?.url ||
      '/';

    event.waitUntil(
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clients) => {
          for (const client of clients) {
            if (
              client.url === url &&
              'focus' in client
            ) {
              return client.focus();
            }
          }

          if (self.clients.openWindow) {
            return self.clients.openWindow(
              url,
            );
          }

          return undefined;
        }),
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Messages from client                                                       */
/* -------------------------------------------------------------------------- */

self.addEventListener(
  'message',
  (event) => {
    const data = event.data;

    if (!data?.type) {
      return;
    }

    if (data.type === 'SKIP_WAITING') {
      void self.skipWaiting();
      return;
    }

    if (data.type === 'NOTIFY_COMPLETION') {
      if (!data.background) {
        return;
      }

      event.waitUntil(
        self.registration.showNotification(
          'AI Response Ready',
          {
            body:
              data.preview ||
              'Your AI assistant has responded',

            icon: '/icons/icon-192.png',

            tag: 'chat-completion',
            renotify: true,

            data: {
              url: '/',
              conversationId:
                data.conversationId,
            },
          },
        ),
      );

      return;
    }

    if (data.type === 'QUEUE_MESSAGE') {
      event.waitUntil(
        queueMessageForSync(
          data.message,
        ),
      );
    }
  },
);

/* -------------------------------------------------------------------------- */
/* IndexedDB                                                                  */
/* -------------------------------------------------------------------------- */

function openDB() {
  return new Promise((resolve, reject) => {
    const request =
      indexedDB.open(
        'ai-chatbot-offline',
        1,
      );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          'messages',
        )
      ) {
        db.createObjectStore(
          'messages',
          {
            keyPath: 'id',
          },
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function getQueuedMessages(db) {
  return new Promise((resolve, reject) => {
    const transaction =
      db.transaction(
        'messages',
        'readonly',
      );

    const store =
      transaction.objectStore(
        'messages',
      );

    const request =
      store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function removeQueuedMessage(
  db,
  id,
) {
  return new Promise((resolve, reject) => {
    const transaction =
      db.transaction(
        'messages',
        'readwrite',
      );

    const store =
      transaction.objectStore(
        'messages',
      );

    const request =
      store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function queueMessageForSync(
  message,
) {
  if (!message?.id) {
    throw new Error(
      '[SW] Cannot queue message without an id',
    );
  }

  const db = await openDB();

  try {
    const transaction =
      db.transaction(
        'messages',
        'readwrite',
      );

    const store =
      transaction.objectStore(
        'messages',
      );

    /*
     * Use `put`, not `add`.
     *
     * Chat currently also writes to IndexedDB
     * as a fallback, so both sides may attempt
     * to persist the same message.
     */
    store.put({
      ...message,
      queuedAt: Date.now(),
    });

    await transactionComplete(
      transaction,
    );

    await self.registration.sync.register(
      'chat-sync',
    );
  } finally {
    db.close();
  }
}

function transactionComplete(
  transaction,
) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(
        transaction.error ||
          new Error(
            'IndexedDB transaction aborted',
          ),
      );
    };
  });
}

console.log(
  '[SW] Service Worker loaded',
);
