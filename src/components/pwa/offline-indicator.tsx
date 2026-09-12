'use client';

import { useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  position?: 'top' | 'bottom';
}

export function OfflineIndicator({ className, position = 'top' }: OfflineIndicatorProps) {
  const { isOnline, wasOffline, resetOfflineFlag } = useOnlineStatus();

  // Both banners are derived straight from hook state — no local visibility
  // flag. The only effect here is the toast's auto-dismiss timer, which sets
  // no state synchronously.
  useEffect(() => {
    if (!wasOffline || !isOnline) return;

    const timer = setTimeout(resetOfflineFlag, 3000);
    return () => clearTimeout(timer);
  }, [wasOffline, isOnline, resetOfflineFlag]);

  const showOfflineBanner = !isOnline;
  const showReconnectedToast = isOnline && wasOffline;

  if (!showOfflineBanner && !showReconnectedToast) return null;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 flex items-center justify-center px-4 py-2',
        'transition-all duration-300 ease-in-out',
        position === 'top' ? 'top-0 border-b' : 'bottom-0 border-t',
        showOfflineBanner
          ? 'bg-yellow-500/90 text-yellow-900 dark:text-yellow-100'
          : 'bg-green-500/90 text-white',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-2 max-w-md w-full">
        {showOfflineBanner ? (
          <>
            <svg className="h-4 w-4 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-sm font-medium">
              You&apos;re offline. Changes will sync when reconnected.
            </span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Back online</span>
          </>
        )}
      </div>
    </div>
  );
}
