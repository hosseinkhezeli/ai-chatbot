'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { fa } from '@/lib/i18n/fa';
import { cn } from '@/lib/utils';

function getErrorMessage(error?: string): string {
  const errors = fa.auth.errors;
  if (!error) return errors.Default;
  return errors[error as keyof typeof errors] ?? errors.Default;
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = getErrorMessage(error);

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <div className="relative flex max-w-md w-full flex-col items-center">
        {/* Subtle background atmosphere */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-destructive/5 blur-3xl" />
        </div>

        <Card className="w-full shadow-2xl ring-1 ring-border bg-card/95 backdrop-blur-sm dark:bg-card/90">
          <CardHeader className="space-y-3 pb-4 border-b border-border/50 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/20">
              <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <CardTitle className="font-heading text-2xl font-bold tracking-tight">
                {fa.auth.errorTitle}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                مشکلی پیش آمد، اما نگران نباش — راه‌حل ساده است.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="rounded-xl bg-destructive/10 p-4 ring-1 ring-destructive/20" role="alert">
              <p className="text-sm text-destructive text-center">{message}</p>
            </div>

            <Link href="/auth/signin">
              <Button
                className="w-full justify-center gap-2 py-3 text-base font-medium rounded-xl group"
              >
                {fa.auth.tryAgain}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Button>
            </Link>

            <p className="text-center text-xs text-muted-foreground">
              اگر مشکل ادامه داشت، با <a href="/support" className="underline hover:text-foreground">پشتیبانی</a> تماس بگیر.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}