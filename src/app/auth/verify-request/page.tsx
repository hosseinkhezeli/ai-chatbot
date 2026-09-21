import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { CheckCircle, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { fa } from '@/lib/i18n/fa';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default async function VerifyRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <div className="relative flex max-w-md w-full flex-col items-center">
        {/* Subtle background atmosphere */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <Card className="w-full shadow-2xl ring-1 ring-border bg-card/95 backdrop-blur-sm dark:bg-card/90">
          <CardHeader className="space-y-3 pb-4 border-b border-border/50 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 dark:bg-primary/20 dark:ring-primary/30">
              <CheckCircle className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <CardTitle className="font-heading text-2xl font-bold tracking-tight">
                {fa.auth.checkEmailTitle}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                تقریبا تمام شد — فقط یک قدم دیگر.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {email && (
              <div className="rounded-xl bg-muted/50 p-4 ring-1 ring-border" dir="ltr">
                <div className="flex items-center gap-3 text-sm">
                  <Mail
                    className="h-5 w-5 text-muted-foreground flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">{email}</span> رو لینک ورود
                    فرستادیم.
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground">{fa.auth.magicLinkSent}</p>

            <Link href="/auth/signin">
              <Button
                variant="outline"
                className="w-full justify-center gap-2 py-3 text-base font-medium rounded-xl group"
              >
                {fa.auth.backToSignIn}
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Button>
            </Link>

            <div className="pt-2 border-t border-border/50">
              <p className="text-center text-xs text-muted-foreground">
                ایمیل نیامد؟ <span className="font-medium text-foreground">اسپم</span> رو چک کن یا
                <Link href="/auth/signin" className="underline hover:text-foreground ml-1">
                  دوباره تلاش کن
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Minimal brand mark at bottom */}
        <div
          className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground/60"
          aria-hidden="true"
        >
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
      </div>
    </main>
  );
}
