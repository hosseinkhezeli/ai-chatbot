import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, GitBranch, Globe } from 'lucide-react';
import { fa } from '@/lib/i18n/fa';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">{fa.auth.signIn}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center" role="alert">
              {fa.auth.errors[error as keyof typeof fa.auth.errors] ?? fa.auth.errors.Default}
            </div>
          )}

          <form
            action={async () => {
              'use server';
              await signIn('github', { redirectTo: callbackUrl ?? '/' });
            }}
          >
            <Button type="submit" className="w-full gap-2" variant="outline">
              <GitBranch className="h-4 w-4" />
              {fa.auth.continueWithGithub}
            </Button>
          </form>

          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: callbackUrl ?? '/' });
            }}
          >
            <Button type="submit" className="w-full gap-2" variant="outline">
              <Globe className="h-4 w-4" />
              {fa.auth.continueWithGoogle}
            </Button>
          </form>

          <Separator className="my-4" />

          <form
            action={async (formData: FormData) => {
              'use server';
              const email = formData.get('email') as string;
              await signIn('email', { email, redirectTo: callbackUrl ?? '/' });
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                {fa.auth.emailLabel}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  className="pl-10"
                  placeholder={fa.auth.emailPlaceholder}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {fa.auth.sendMagicLink}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
