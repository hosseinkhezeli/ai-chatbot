import {
  API_PATTERNS,
  STATIC_PATTERNS,
  TRUSTED_EXTERNAL_ORIGINS,
} from './config';

export function matchesPattern(
  request: Request,
  patterns: readonly RegExp[],
): boolean {
  const url = new URL(request.url);

  return patterns.some((pattern) => pattern.test(url.pathname));
}

export function isAllowedRequest(url: URL): boolean {
  return (
    url.origin === self.location.origin ||
    TRUSTED_EXTERNAL_ORIGINS.has(url.origin)
  );
}

export function isNextInternalRequest(url: URL): boolean {
  return (
    url.origin === self.location.origin && url.pathname.startsWith('/_next/')
  );
}

export function isStaticRequest(request: Request): boolean {
  return (
    request.method === 'GET' && matchesPattern(request, STATIC_PATTERNS)
  );
}

export function isApiRequest(request: Request): boolean {
  return matchesPattern(request, API_PATTERNS);
}

export function isStaticCacheableResponse(response: Response): boolean {
  return response.ok || response.type === 'opaque';
}

export function isExplicitlyCacheableNavigation(
  response: Response,
): boolean {
  const cacheControl =
    response.headers.get('Cache-Control')?.toLowerCase() ?? '';

  return (
    !cacheControl.includes('no-store') &&
    !cacheControl.includes('private') &&
    cacheControl.includes('public')
  );
}

export function getSafeNotificationUrl(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return '/';
  }

  try {
    const url = new URL(value, self.location.origin);

    if (url.origin !== self.location.origin) {
      return '/';
    }

    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}