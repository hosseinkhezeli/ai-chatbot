import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const pathname = req.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith('/auth/');
  const isApiAuthRoute = pathname.startsWith('/api/auth/');

  // Allow authentication routes
  if (isAuthRoute || isApiAuthRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users
  if (!isAuthenticated) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin);

    signInUrl.searchParams.set('callbackUrl', `${pathname}${req.nextUrl.search}`);

    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api/auth|auth|_next/static|_next/image|_next/hmr|favicon.ico|robots.txt|manifest.json|sw.js|icons|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)',
  ],
};
