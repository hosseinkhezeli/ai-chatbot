import { CACHE_PREFIX, STATIC_CACHE, NAVIGATION_CACHE } from '../config';

const sw = self as unknown as ServiceWorkerGlobalScope;

export function registerActivate(): void {
  sw.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(
      (async () => {
        const activeCaches = new Set([STATIC_CACHE, NAVIGATION_CACHE]);

        const cacheNames = await caches.keys();

        await Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith(CACHE_PREFIX) && !activeCaches.has(name),
            )
            .map((name) => caches.delete(name)),
        );

        await sw.clients.claim();
      })(),
    );
  });
}