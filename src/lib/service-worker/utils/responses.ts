import { STRINGS } from '../constants';

export function createOfflineApiResponse(request: Request): Response {
  const isChatRequest =
    request.method === 'POST' &&
    new URL(request.url).pathname === '/api/chat';

  return new Response(
    JSON.stringify({
      error: 'Offline',
      offline: true,
      ...(isChatRequest && {
        message: STRINGS.queueOfflineMessage,
      }),
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}