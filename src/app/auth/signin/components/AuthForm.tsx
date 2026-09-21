import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { fa } from '@/lib/i18n/fa';

import { Mail } from 'lucide-react';
import { signIn } from '@/lib/auth';

async function githubSignIn(callbackUrl?: string) {
  'use server';

  await signIn('github', {
    redirectTo: callbackUrl ?? '/',
  });
}

async function googleSignIn(callbackUrl?: string) {
  'use server';

  await signIn('google', {
    redirectTo: callbackUrl ?? '/',
  });
}

async function emailSignIn(formData: FormData) {
  'use server';

  const email = formData.get('email') as string;

  if (!email || !email.includes('@')) {
    return;
  }

  await signIn('email', {
    email,
    redirectTo: '/',
  });
}

export function AuthForm({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <Card className="w-full max-w-md lg:max-w-lg shadow-2xl ring-1 ring-border bg-card/95 backdrop-blur-sm dark:bg-card/90">
      <CardHeader className="space-y-3 lg:space-y-4 pb-4 lg:pb-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading text-2xl lg:text-3xl font-bold tracking-tight">
              {fa.auth.signIn}
            </CardTitle>

            <CardDescription className="mt-1 text-muted-foreground">
              به نورن خوش آمدی. روش ورود را انتخاب کن.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 lg:space-y-5 pt-4 lg:pt-6">
        <div className="space-y-3">
          <form action={githubSignIn.bind(null, callbackUrl)}>
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-start gap-3 text-right lg:text-left py-3 lg:py-3.5 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon icon-tabler icons-tabler-outline icon-tabler-brand-github"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" />
              </svg>
              <span className="font-medium">{fa.auth.continueWithGithub}</span>
            </Button>
          </form>

          <form action={googleSignIn.bind(null, callbackUrl)}>
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-start gap-3 text-right lg:text-left py-3 lg:py-3.5 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon icon-tabler icons-tabler-outline icon-tabler-brand-google"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M20.945 11a9 9 0 1 1 -3.284 -5.997l-2.655 2.392a5.5 5.5 0 1 0 2.119 6.605h-4.125v-3h7.945" />
              </svg>
              <span className="font-medium">{fa.auth.continueWithGoogle}</span>
            </Button>
          </form>
        </div>

        <div className="relative my-2 lg:my-4">
          <Separator />

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card/95 backdrop-blur-sm px-3 text-xs font-medium text-muted-foreground">
            یا با ایمیل
          </div>
        </div>

        <form action={emailSignIn} className="space-y-4" noValidate>
          <div className="space-y-4">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              {fa.auth.emailLabel}
            </Label>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-2 right-0 top-3 flex items-center pr-3">
                <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>

              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                dir="ltr"
                className="pr-10 pl-3 lg:pl-4 py-3 mt-2"
                placeholder={fa.auth.emailPlaceholder}
                required
              />
            </div>

            <p className="text-xs text-muted-foreground">
              لینک ورود به این آدرس ارسال می‌شود. ایمیل تو در امان می‌ماند.
            </p>
          </div>

          <Button type="submit" className="w-full py-3 lg:py-3.5  rounded-xl">
            {fa.auth.sendMagicLink}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground pt-2 lg:pt-4">
          با ورود، تو{' '}
          <a href="/terms" className="underline hover:text-foreground">
            شرایط استفاده
          </a>{' '}
          و{' '}
          <a href="/privacy" className="underline hover:text-foreground">
            حریم‌خصوصی
          </a>{' '}
          را می‌پذیری.
        </p>
      </CardContent>
    </Card>
  );
}
