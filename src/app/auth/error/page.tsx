// src/app/auth/error/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { fa } from '@/lib/i18n/fa';

// Auth.js passes ?error=<code> on redirect. These are the standard codes
// it can emit — see https://authjs.dev/reference/core/errors
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
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">{fa.auth.errorTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">{message}</p>
          <Button className="w-full">
            <Link href="/auth/signin">{fa.auth.tryAgain}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
