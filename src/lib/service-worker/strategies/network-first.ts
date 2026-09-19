import { NAVIGATION_CACHE, OFFLINE_URL } from '../config';
import { isExplicitlyCacheableNavigation } from '../utils';

/**
 * NETWORK FIRST
 *
 * Used only for real document navigations. Fresh HTML wins; cached HTML is
 * a resilience mechanism for network failures, not the primary source.
 */
export async function networkFirstNavigation(
  request: Request,
): Promise<Response> {
  const cache = await caches.open(NAVIGATION_CACHE);

  try {
    const networkResponse = await fetch(request);

    if (
      networkResponse.ok &&
      isExplicitlyCacheableNavigation(networkResponse)
    ) {
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

    return new Response('Offline', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}