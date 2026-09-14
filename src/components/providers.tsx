'use client';

import type { ReactNode } from 'react';
import { DirectionProvider } from '@base-ui/react/direction-provider';

/**
 * Base UI (shadcn v4's primitive layer) renders dropdowns, tooltips, popovers
 * and sheets into a portal that is a sibling of <html>, not a descendant —
 * so it never inherits the app's dir="rtl" set on <html lang="fa" dir="rtl">.
 * Without this provider every popup positions as if the app were LTR.
 *
 * This is the one, single place the whole app declares its text direction to
 * Base UI. RootLayout must keep this provider's `direction` in sync with the
 * `dir` attribute on <html>.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <DirectionProvider direction="rtl">{children}</DirectionProvider>;
}
