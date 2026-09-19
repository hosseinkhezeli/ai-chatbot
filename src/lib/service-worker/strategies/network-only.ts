import { STRINGS } from '../constants';
import { createOfflineApiResponse } from '../utils/responses';

/**
 * NETWORK ONLY
 *
 * API responses are deliberately excluded from Cache Storage because they may
 * contain authenticated, user-specific application state.
 */
export async function networkOnly(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch (error) {
    console.warn(
      '[SW] Network-only request failed:',
      request.method,
      request.url,
      error,
    );
    return createOfflineApiResponse(request);
  }
}