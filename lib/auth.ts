import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Email from 'next-auth/providers/email';
import { DrizzleAdapter } from '@auth/drizzle-adapter';

import { db } from '@/db/client';
import { accountsTable, sessionsTable, usersTable, verificationTokensTable } from '@/db/schema';

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return null;
  }

  return {
    server: {
      host: 'smtp.resend.com',
      port: 465,
      auth: {
        user: 'resend',
        pass: apiKey,
      },
    },
    from,
  };
}

const baseProviders = [
  GitHub({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  }),
  Google({
    clientId: process.env.AUTH_GOOGLE_ID!,
    clientSecret: process.env.AUTH_GOOGLE_SECRET!,
  }),
];

const emailConfig = getEmailConfig();
const providers = emailConfig ? [...baseProviders, Email(emailConfig)] : baseProviders;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable,
    accountsTable,
    sessionsTable,
    verificationTokensTable,
  }),

  providers,

  session: {
    strategy: 'database',
  },

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  secret: process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
  logger: {
    error(error) {
      console.error('[AUTH ERROR]', error.name);
      console.error('[AUTH ERROR OBJECT]', error);
      console.error('[AUTH ERROR CAUSE]', error?.cause);
    },
  },
});
