import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { fa } from '@/lib/i18n/fa';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">{fa.auth.signIn}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              'use server';
              await signIn('github', { redirectTo: callbackUrl ?? '/' });
            }}
          >
            <Button type="submit" className="w-full">
              {fa.auth.continueWithGithub}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
