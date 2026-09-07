// src/app/auth/error/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Auth.js passes ?error=<code> on redirect. These are the standard codes
// it can emit — see https://authjs.dev/reference/core/errors
const ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration. Please try again later.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The sign in link is no longer valid. It may have expired or already been used.',
  OAuthSignin: 'There was a problem starting the sign in process. Please try again.',
  OAuthCallback: 'There was a problem completing sign in. Please try again.',
  OAuthAccountNotLinked:
    'This account is linked to a different sign-in method. Please use the original method you signed up with.',
  Default: 'Something went wrong while signing in. Please try again.',
};

function getErrorMessage(error?: string): string {
  if (!error) return ERROR_MESSAGES.Default;
  return ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default;
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
          <CardTitle className="text-center">Authentication error</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">{message}</p>
          <Button className="w-full">
            <Link href="/auth/signin">Try again</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
