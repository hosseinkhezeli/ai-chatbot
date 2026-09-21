'use client';

import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { fa } from '@/lib/i18n/fa';

export default async function VerifyRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>{fa.auth.checkEmailTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {email && (
            <div
              className="rounded-md bg-muted p-4 text-sm text-muted-foreground"
              dir="ltr"
              dangerouslySetInnerHTML={{
                __html: fa.auth.checkEmailBody.replace('{email}', email),
              }}
            />
          )}
          <p className="text-sm text-muted-foreground">
            {fa.auth.magicLinkSent}
          </p>
          <Link href="/auth/signin">
            <Button variant="outline">{fa.auth.backToSignIn}</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}