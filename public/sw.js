/**
 * Service Worker for AI Chatbot PWA
 *
 * Caching Strategy:
 * - Static assets (JS, CSS, fonts, images): Cache First
 * - API routes (/api/*): Network First with offline fallback
 * - Navigation (HTML): Stale While Revalidate
 * - Offline page: Pre-cached
 */

const CACHE_NAME = 'ai-chatbot-v1';
const STATIC_CACHE = 'ai-chatbot-static-v1';
const API_CACHE = 'ai-chatbot-api-v1';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Static asset patterns (cache first)
const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\/_next\/image\//,
  /\/fonts\//,
  /\/icons\//,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
  /\.(?:js|css)$/,
];

// API routes (network first)
const API_PATTERNS = [
  /^\/api\//,
];

// Navigation requests (stale while revalidate)
const NAVIGATION_PATTERNS = [
  /^\/$/,
  /^\/(?!api|_next|fonts|icons|manifest|offline).*/,
];

/**
 * Check if request matches any pattern
 */
function matchesPattern(request, patterns) {
  const url = new URL(request.url);
  return patterns.some(pattern => pattern.test(url.pathname));
}

/**
 * Cache First Strategy - for static assets
 */
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    throw error;
  }
}

/**
 * Network First Strategy - for API routes
 */
async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Clone for cache and response
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);

    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // For chat API, return a structured offline response
    if (request.method === 'POST' && request.url.includes('/api/chat')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'You are offline. Your message will be sent when connection is restored.',
          offline: true,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // For other API routes, return generic offline response
    return new Response(
      JSON.stringify({ error: 'Offline', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Stale While Revalidate - for navigation
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

/**
 * Install Event - Pre-cache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      console.log('[SW] Pre-cache complete');
      return self.skipWaiting();
    })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name !== CACHE_NAME &&
              name !== STATIC_CACHE &&
              name !== API_CACHE
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activated');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch Event - Route requests to appropriate strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET/POST requests
  if (!['GET', 'POST'].includes(request.method)) {
    return;
  }

  // Skip non-http(s) requests
  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol)) {
    return;
  }

  // Skip cross-origin requests (except for known CDN)
  if (url.origin !== location.origin && !url.hostname.includes('fonts.googleapis.com') && !url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  // Route to appropriate strategy
  if (matchesPattern(request, STATIC_PATTERNS)) {
    event.respondWith(cacheFirst(request));
  } else if (matchesPattern(request, API_PATTERNS)) {
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else if (matchesPattern(request, NAVIGATION_PATTERNS) || request.mode === 'navigate') {
    event.respondWith(
      staleWhileRevalidate(request).catch(() => {
        // Fallback to offline page for navigation failures
        return caches.match(OFFLINE_URL);
      })
    );
  }
});

/**
 * Background Sync - Retry queued chat messages
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'chat-sync') {
    console.log('[SW] Background sync: chat-sync');
    event.waitUntil(retryQueuedMessages());
  }
});

/**
 * Retry queued messages from IndexedDB
 */
async function retryQueuedMessages() {
  try {
    // Open IndexedDB to get queued messages
    const db = await openDB();
    const messages = await getQueuedMessages(db);

    for (const message of messages) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        if (response.ok) {
          await removeQueuedMessage(db, message.id);
          console.log('[SW] Synced message:', message.id);

          // Notify client of successful sync
          const clients = await self.clients.matchAll();
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              messageId: message.id,
            });
          });
        }
      } catch (error) {
        console.error('[SW] Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Push Event - Handle push notifications
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New message received',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      messageId: data.messageId,
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    tag: 'chat-notification',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AI Chatbot', options)
  );
});

/**
 * Notification Click Event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Try to focus existing window
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

/**
 * Message Event - Communication with client
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message from client:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'NOTIFY_COMPLETION') {
    // Show notification for completed AI response
    if (event.data.background) {
      self.registration.showNotification('AI Response Ready', {
        body: event.data.preview || 'Your AI assistant has responded',
        icon: '/icons/icon-192.png',
        tag: 'chat-completion',
        renotify: true,
        data: {
          url: '/',
          conversationId: event.data.conversationId,
        },
      });
    }
  }

  if (event.data.type === 'QUEUE_MESSAGE') {
    // Queue message for background sync
    queueMessageForSync(event.data.message);
  }
});

/**
 * IndexedDB Helpers for offline message queue
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ai-chatbot-offline', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getQueuedMessages(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('messages', 'readonly');
    const store = transaction.objectStore('messages');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removeQueuedMessage(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('messages', 'readwrite');
    const store = transaction.objectStore('messages');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function queueMessageForSync(message) {
  try {
    const db = await openDB();
    const transaction = db.transaction('messages', 'readwrite');
    const store = transaction.objectStore('messages');
    await store.add({
      id: message.id,
      ...message,
      queuedAt: Date.now(),
    });

    // Register background sync
    const reg = await self.registration.ready;
    await reg.sync.register('chat-sync');
  } catch (error) {
    console.error('[SW] Failed to queue message:', error);
  }
}

console.log('[SW] Service Worker loaded');