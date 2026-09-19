"use strict";
(() => {
  // src/lib/service-worker/config.ts
  var STATIC_CACHE = "ai-chatbot-static-v2";
  var NAVIGATION_CACHE = "ai-chatbot-navigation-v1";
  var OFFLINE_URL = "/offline.html";
  var CACHE_PREFIX = "ai-chatbot-";
  var PRECACHE_ASSETS = [
    OFFLINE_URL,
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/badge-72.png"
  ];
  var STATIC_PATTERNS = [
    /\/fonts\//,
    /\/icons\//,
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
    /\.(?:js|css)$/
  ];
  var API_PATTERNS = [/^\/api\//];
  var TRUSTED_EXTERNAL_ORIGINS = /* @__PURE__ */ new Set([
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com"
  ]);
  var SYNC_TAG = "chat-sync";
  var OFFLINE_DB_NAME = "ai-chatbot-offline";
  var OFFLINE_DB_VERSION = 1;
  var OUTBOX_STORE = "messages";

  // src/lib/service-worker/handlers/activate.ts
  var sw = self;
  function registerActivate() {
    sw.addEventListener("activate", (event) => {
      event.waitUntil(
        (async () => {
          const activeCaches = /* @__PURE__ */ new Set([STATIC_CACHE, NAVIGATION_CACHE]);
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.filter(
              (name) => name.startsWith(CACHE_PREFIX) && !activeCaches.has(name)
            ).map((name) => caches.delete(name))
          );
          await sw.clients.claim();
        })()
      );
    });
  }

  // src/lib/service-worker/constants.ts
  var MESSAGE_TYPES = {
    SKIP_WAITING: "SKIP_WAITING",
    QUEUE_MESSAGE: "QUEUE_MESSAGE",
    RETRY_QUEUE: "RETRY_QUEUE",
    SYNC_SUCCESS: "SYNC_SUCCESS",
    SYNC_FAILED: "SYNC_FAILED",
    NOTIFY_COMPLETION: "NOTIFY_COMPLETION"
  };
  var STRINGS = {
    queueOfflineMessage: "\u0634\u0645\u0627 \u0622\u0641\u0644\u0627\u06CC\u0646 \u0647\u0633\u062A\u06CC\u062F. \u067E\u06CC\u0627\u0645\u062A \u067E\u0633 \u0627\u0632 \u0628\u0627\u0632\u06AF\u0634\u062A \u0627\u062A\u0635\u0627\u0644 \u0627\u0631\u0633\u0627\u0644 \u062E\u0648\u0627\u0647\u062F \u0634\u062F.",
    pushDefaultTitle: "\u0686\u062A\u200C\u0628\u0627\u062A \u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06CC",
    pushDefaultBody: "\u067E\u06CC\u0627\u0645 \u062C\u062F\u06CC\u062F\u06CC \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F.",
    notificationOpen: "\u0628\u0627\u0632 \u06A9\u0631\u062F\u0646",
    notificationDismiss: "\u0631\u062F \u06A9\u0631\u062F\u0646",
    responseReadyTitle: "\u067E\u0627\u0633\u062E \u0622\u0645\u0627\u062F\u0647 \u0627\u0633\u062A",
    responseReadyBody: "\u062F\u0633\u062A\u06CC\u0627\u0631 \u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06CC \u0634\u0645\u0627 \u067E\u0627\u0633\u062E \u062F\u0627\u062F."
  };

  // src/lib/service-worker/utils/responses.ts
  function createOfflineApiResponse(request) {
    const isChatRequest = request.method === "POST" && new URL(request.url).pathname === "/api/chat";
    return new Response(
      JSON.stringify({
        error: "Offline",
        offline: true,
        ...isChatRequest && {
          message: STRINGS.queueOfflineMessage
        }
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  // src/lib/service-worker/strategies/network-only.ts
  async function networkOnly(request) {
    try {
      return await fetch(request);
    } catch (error) {
      console.warn(
        "[SW] Network-only request failed:",
        request.method,
        request.url,
        error
      );
      return createOfflineApiResponse(request);
    }
  }

  // src/lib/service-worker/utils.ts
  function matchesPattern(request, patterns) {
    const url = new URL(request.url);
    return patterns.some((pattern) => pattern.test(url.pathname));
  }
  function isAllowedRequest(url) {
    return url.origin === self.location.origin || TRUSTED_EXTERNAL_ORIGINS.has(url.origin);
  }
  function isNextInternalRequest(url) {
    return url.origin === self.location.origin && url.pathname.startsWith("/_next/");
  }
  function isStaticRequest(request) {
    return request.method === "GET" && matchesPattern(request, STATIC_PATTERNS);
  }
  function isApiRequest(request) {
    return matchesPattern(request, API_PATTERNS);
  }
  function isStaticCacheableResponse(response) {
    return response.ok || response.type === "opaque";
  }
  function isExplicitlyCacheableNavigation(response) {
    const cacheControl = response.headers.get("Cache-Control")?.toLowerCase() ?? "";
    return !cacheControl.includes("no-store") && !cacheControl.includes("private") && cacheControl.includes("public");
  }
  function getSafeNotificationUrl(value) {
    if (typeof value !== "string" || !value) {
      return "/";
    }
    try {
      const url = new URL(value, self.location.origin);
      if (url.origin !== self.location.origin) {
        return "/";
      }
      return url.pathname + url.search + url.hash;
    } catch {
      return "/";
    }
  }

  // src/lib/service-worker/strategies/cache-first.ts
  async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    const networkResponse = await fetch(request);
    if (request.method === "GET" && isStaticCacheableResponse(networkResponse)) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }

  // src/lib/service-worker/strategies/network-first.ts
  async function networkFirstNavigation(request) {
    const cache = await caches.open(NAVIGATION_CACHE);
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok && isExplicitlyCacheableNavigation(networkResponse)) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      const offlinePage = await caches.match(OFFLINE_URL);
      if (offlinePage) {
        return offlinePage;
      }
      return new Response("Offline", {
        status: 503,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }
  }

  // src/lib/service-worker/handlers/fetch.ts
  var sw2 = self;
  function registerFetch() {
    sw2.addEventListener("fetch", (event) => {
      const { request } = event;
      if (!["GET", "POST"].includes(request.method)) {
        return;
      }
      const url = new URL(request.url);
      if (!["http:", "https:"].includes(url.protocol)) {
        return;
      }
      if (!isAllowedRequest(url)) {
        return;
      }
      if (isNextInternalRequest(url)) {
        return;
      }
      if (isStaticRequest(request)) {
        event.respondWith(cacheFirst(request));
        return;
      }
      if (isApiRequest(request)) {
        event.respondWith(networkOnly(request));
        return;
      }
      if (request.method === "GET" && request.mode === "navigate") {
        event.respondWith(networkFirstNavigation(request));
      }
    });
  }

  // src/lib/service-worker/handlers/install.ts
  var sw3 = self;
  function registerInstall() {
    sw3.addEventListener("install", (event) => {
      event.waitUntil(
        (async () => {
          const cache = await caches.open(STATIC_CACHE);
          await cache.addAll([...PRECACHE_ASSETS]);
          await sw3.skipWaiting();
        })()
      );
    });
  }

  // src/lib/service-worker/storage/indexed-db.ts
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          db.createObjectStore(OUTBOX_STORE, {
            keyPath: "id"
          });
        }
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
      request.onblocked = () => {
        reject(new Error("IndexedDB upgrade blocked"));
      };
    });
  }
  function transactionComplete(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
      transaction.onabort = () => {
        reject(
          transaction.error || new Error("IndexedDB transaction aborted")
        );
      };
    });
  }

  // src/lib/service-worker/storage/outbox.ts
  function getQueuedMessages(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE, "readonly");
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
  function removeQueuedMessage(db, id) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE, "readwrite");
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
          transaction.error || new Error("IndexedDB transaction aborted")
        );
      };
    });
  }
  async function queueMessage(message) {
    if (!message?.id) {
      throw new Error("[SW] Cannot queue message without an id");
    }
    const db = await openDB();
    try {
      const transaction = db.transaction(OUTBOX_STORE, "readwrite");
      const store = transaction.objectStore(OUTBOX_STORE);
      store.put({
        ...message,
        queuedAt: Date.now()
      });
      await transactionComplete(transaction);
    } finally {
      db.close();
    }
  }

  // src/lib/service-worker/handlers/sync.ts
  var sw4 = self;
  async function broadcastMessage(message) {
    const clients = await sw4.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });
    for (const client of clients) {
      client.postMessage(message);
    }
  }
  async function retryQueuedMessages() {
    let db = null;
    let hasTransientFailure = false;
    try {
      db = await openDB();
      const messages = await getQueuedMessages(db);
      for (const message of messages) {
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              /*
               * `/api/chat` should treat this identifier as an idempotency
               * key so a retry cannot create the same message twice.
               */
              "Idempotency-Key": message.id
            },
            body: JSON.stringify(message)
          });
          if (response.ok) {
            await response.text();
            await removeQueuedMessage(db, message.id);
            await broadcastMessage({
              type: MESSAGE_TYPES.SYNC_SUCCESS,
              messageId: message.id
            });
            continue;
          }
          if (response.status === 429 || response.status >= 500) {
            hasTransientFailure = true;
            continue;
          }
          await removeQueuedMessage(db, message.id);
          await broadcastMessage({
            type: MESSAGE_TYPES.SYNC_FAILED,
            messageId: message.id,
            status: response.status
          });
        } catch (error) {
          console.warn("[SW] Chat sync failed:", message.id, error);
          hasTransientFailure = true;
        }
      }
      if (hasTransientFailure) {
        throw new Error("Transient chat sync failure");
      }
    } finally {
      db?.close();
    }
  }
  function registerSync() {
    sw4.addEventListener("sync", (event) => {
      if (event.tag !== SYNC_TAG) {
        return;
      }
      event.waitUntil(retryQueuedMessages());
    });
  }
  async function queueMessageForSync(message) {
    await queueMessage(message);
    const syncManager = sw4.registration.sync;
    if (syncManager) {
      try {
        await syncManager.register(SYNC_TAG);
      } catch (error) {
        console.warn("[SW] Background Sync unavailable:", error);
      }
    }
  }
  async function retryQueueManually() {
    try {
      await retryQueuedMessages();
    } catch (error) {
      console.warn("[SW] Manual queue retry failed:", error);
    }
  }

  // src/lib/service-worker/handlers/message.ts
  var sw5 = self;
  function registerMessage() {
    sw5.addEventListener("message", (event) => {
      const data = event.data;
      if (!data?.type) {
        return;
      }
      if (data.type === MESSAGE_TYPES.SKIP_WAITING) {
        void sw5.skipWaiting();
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
        const options = {
          body: data.preview || STRINGS.responseReadyBody,
          icon: "/icons/icon-192.png",
          tag: "chat-completion",
          renotify: true,
          data: {
            url: "/",
            conversationId: data.conversationId
          }
        };
        event.waitUntil(
          sw5.registration.showNotification(STRINGS.responseReadyTitle, options)
        );
      }
    });
  }

  // src/lib/service-worker/handlers/notification-click.ts
  var sw6 = self;
  function registerNotificationClick() {
    sw6.addEventListener("notificationclick", (event) => {
      event.notification.close();
      if (event.action === "dismiss") {
        return;
      }
      const url = event.notification.data?.url || "/";
      event.waitUntil(
        (async () => {
          const clients = await sw6.clients.matchAll({
            type: "window",
            includeUncontrolled: true
          });
          for (const client of clients) {
            if (client.url === url && "focus" in client) {
              await client.focus();
              return;
            }
          }
          if (sw6.clients.openWindow) {
            await sw6.clients.openWindow(url);
          }
        })()
      );
    });
  }

  // src/lib/service-worker/handlers/push.ts
  var sw7 = self;
  function registerPush() {
    sw7.addEventListener("push", (event) => {
      if (!event.data) {
        return;
      }
      let data = {};
      try {
        const parsed = event.data.json();
        if (parsed && typeof parsed === "object") {
          data = parsed;
        }
      } catch {
      }
      const options = {
        body: data.body || STRINGS.pushDefaultBody,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        vibrate: [100, 50, 100],
        data: {
          url: getSafeNotificationUrl(data.url),
          messageId: data.messageId
        },
        actions: [
          { action: "open", title: STRINGS.notificationOpen },
          { action: "dismiss", title: STRINGS.notificationDismiss }
        ],
        tag: "chat-notification",
        renotify: true,
        requireInteraction: false
      };
      event.waitUntil(
        sw7.registration.showNotification(
          data.title || STRINGS.pushDefaultTitle,
          options
        )
      );
    });
  }

  // src/lib/service-worker/sw.ts
  registerInstall();
  registerActivate();
  registerFetch();
  registerSync();
  registerPush();
  registerNotificationClick();
  registerMessage();
})();
//# sourceMappingURL=sw.js.map
