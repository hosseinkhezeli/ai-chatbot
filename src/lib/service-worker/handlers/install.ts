import { PRECACHE_ASSETS, STATIC_CACHE } from '../config';

const sw = self as unknown as ServiceWorkerGlobalScope;

export function registerInstall(): void {
  sw.addEventListener('install', (event: ExtendableEvent) => {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);

        /*
         * Installation must not complete until the offline shell is
         * actually available.
         */
        await cache.addAll([...PRECACHE_ASSETS]);

        await sw.skipWaiting();
      })(),
    );
  });
}