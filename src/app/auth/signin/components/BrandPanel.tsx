import { Lock, Sparkles, Moon } from 'lucide-react';
import Image from 'next/image';

export function BrandPanel() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center p-8 lg:p-16 bg-linear-to-br from-background via-background to-muted/50 dark:from-background dark:via-background dark:to-muted/30">
      {/* Atmospheric background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 lg:-top-80 lg:-right-80 h-80 w-80 lg:h-160 lg:w-160 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 lg:-bottom-80 lg:-left-80 h-80 w-80 lg:h-160 lg:w-160 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-150 w-150 rounded-full bg-primary/5 blur-3xl opacity-50" />

        {/* Subtle geometric pattern */}
        <div className="absolute inset-0 opacity-5" aria-hidden="true">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      <div className="relative z-10 flex max-w-lg flex-col items-center text-center space-y-8">
        {/* Logo placeholder */}
        <div
          className="flex flex-col h-26 w-26 items-center justify-center"
          style={{ filter: 'invert(1)' }}
        >
          <Image src={'/icons/icon.svg'} alt="logo" width={200} height={200} />
          <Image src={'/logo-type.svg'} alt="logo" width={150} height={50} />
        </div>
        {/* Brand identity */}
        <div className="space-y-4">
          <h1 className="font-heading text-4xl lg:text-6xl  tracking-tight text-foreground">
            نورن
          </h1>

          <p className="text-lg text-muted-foreground max-w-sm leading-relaxed">
            هوش مصنوعیِ اختصاصیِ تو — با سیستم‌پرامپت و ابزارهای خودت، نه پیش‌فرضِ فروشنده.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 text-primary/70" aria-hidden="true" />
            <span>حریم‌خصوصی کامل</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Moon className="h-4 w-4 text-primary/70" aria-hidden="true" />
            <span>حالت تاریک پیش‌فرض</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary/70" aria-hidden="true" />
            <span>استریم‌رو </span>
          </div>
        </div>

        {/* Subtle decorative line */}
        <div className="relative w-full max-w-xs pt-8" aria-hidden="true">
          <div className="relative h-px bg-linear-to-r from-transparent via-border to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-sm ring-1 ring-border">
            <span className="text-xs text-muted-foreground font-medium">نسخه ۱.۰</span>
          </div>
        </div>
      </div>
    </div>
  );
}
