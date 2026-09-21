import { Sparkles } from 'lucide-react';

import { Suspense } from 'react';
import { BrandPanel } from './BrandPanel';
import { AuthForm } from './AuthForm';
import Image from 'next/image';

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const { callbackUrl, error: urlError } = searchParams;

  return (
    <main className="relative flex min-h-screen">
      {/* RTL-aware split layout: Brand on right (primary for RTL), Form on left */}
      <div className="relative flex min-h-screen h-full w-full flex-col lg:flex-row rtl:lg:flex-row-reverse">
        {/* Brand Panel - Visual Identity */}
        <div className="hidden lg:flex lg:w-1/2 lg:max-w-xl shrink-0">
          <BrandPanel />
        </div>

        {/* Auth Form Panel */}
        <div className="flex min-h-full w-full flex-col items-center justify-center p-4 lg:p-8 lg:w-1/2  grow">
          <div className="w-full max-w-md">
            <Suspense
              fallback={
                <div className="space-y-4 animate-pulse" aria-busy="true">
                  <div className="h-8 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="space-y-3">
                    <div className="h-12 bg-muted rounded-xl" />
                    <div className="h-12 bg-muted rounded-xl" />
                  </div>
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-12 bg-muted rounded-xl" />
                </div>
              }
            >
              <AuthForm callbackUrl={callbackUrl} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Mobile Brand Indicator - minimal at top */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-10 flex items-center justify-center gap-3 p-4 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 dark:bg-primary/20 dark:ring-primary/30"
          style={{ filter: 'invert(1)' }}
        >
          <Image src={'/icons/icon.svg'} alt="logo" width={200} height={200} />
        </div>
        <span
          className="font-heading text-lg font-bold text-foreground"
          style={{ filter: 'invert(1)' }}
        >
          <Image src={'/logo-type.svg'} alt="logo" width={150} height={50} />
        </span>
      </div>
    </main>
  );
}
