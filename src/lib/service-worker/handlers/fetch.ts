import { networkOnly } from '../strategies/network-only';
import { cacheFirst } from '../strategies/cache-first';
import { networkFirstNavigation } from '../strategies/network-first';
import {
  isAllowedRequest,
  isApiRequest,
  isNextInternalRequest,
  isStaticRequest,
} from '../utils';

const sw = self as unknown as ServiceWorkerGlobalScope;

export function registerFetch(): void {
  sw.addEventListener('fetch', (event: FetchEvent) => {
    const { request } = event;

    if (!['GET', 'POST'].includes(request.method)) {
      return;
    }

    const url = new URL(request.url);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return;
    }

    if (!isAllowedRequest(url)) {
      return;
    }

    /*
     * Next.js owns its internal runtime, RSC and build assets.
     */
    if (isNextInternalRequest(url)) {
      return;
    }

    /* -------------------------------------------------------------- */
    /* STRATEGY: Cache First — static resources                      */
    /* -------------------------------------------------------------- */

    if (isStaticRequest(request)) {
      event.respondWith(cacheFirst(request));
      return;
    }

    /* -------------------------------------------------------------- */
    /* STRATEGY: Network Only — APIs                                 */
    /* -------------------------------------------------------------- */

    if (isApiRequest(request)) {
      event.respondWith(networkOnly(request));
      return;
    }

    /* -------------------------------------------------------------- */
    /* STRATEGY: Network First — document navigation                 */
    /* -------------------------------------------------------------- */

    if (request.method === 'GET' && request.mode === 'navigate') {
      event.respondWith(networkFirstNavigation(request));
    }
  });
}