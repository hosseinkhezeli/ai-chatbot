import { STATIC_CACHE } from '../config';
import { isStaticCacheableResponse } from '../utils';

/**
 * CACHE FIRST
 *
 * Appropriate for static resources where an existing response is safe to
 * reuse without contacting the server on every request.
 */
export async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (
    request.method === 'GET' &&
    isStaticCacheableResponse(networkResponse)
  ) {
    await cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}