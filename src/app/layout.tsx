import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, JetBrains_Mono, Vazirmatn } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/components/providers';
import { fa } from '@/lib/i18n/fa';

// Vazirmatn is a Persian-first Google Font — full Arabic-script coverage plus
// its own Latin figures. It is the app's primary UI face; next/font self-hosts
// it (same mechanism as the other fonts here — no new npm dependency).
const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: fa.meta.title,
  description: fa.meta.description,
  applicationName: fa.meta.title,
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  robots: 'noindex, nofollow',
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: '/',
    title: fa.meta.title,
    description: fa.meta.description,
    siteName: fa.meta.title,
  },
  twitter: {
    card: 'summary_large_image',
    title: fa.meta.title,
    description: fa.meta.description,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
    other: [
      { rel: 'manifest', url: '/manifest.json' },
      { rel: 'apple-touch-icon', url: '/icons/apple-touch-icon.png' },
      { rel: 'mask-icon', url: '/icons/icon-512.png', color: '#000000' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: fa.meta.appleWebAppTitle,
    startupImage: [
      {
        url: '/icons/icon-512.png',
        media:
          '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  other: {
    'msapplication-TileColor': '#000000',
    'msapplication-tap-highlight': 'no',
    'format-detection': 'telephone=no',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={cn(
        'h-full',
        'antialiased dark',
        geistSans.variable,
        geistMono.variable,
        'font-mono',
        jetbrainsMono.variable,
        'font-sans',
        vazirmatn.variable,
      )}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={fa.meta.appleWebAppTitle} />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
