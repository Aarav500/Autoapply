import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { db } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    // Development-only credentials provider
    ...(process.env.NODE_ENV === 'development'
      ? [
          Credentials({
            name: 'Development',
            credentials: {
              email: { label: 'Email', type: 'email' },
              name: { label: 'Name', type: 'text' },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;

              const email = credentials.email as string;
              const name = (credentials.name as string) || 'Dev User';

              // Find or create user
              let user = await db.user.findUnique({
                where: { email },
              });

              if (!user) {
                user = await db.user.create({
                  data: {
                    email,
                    name,
                    profile: {
                      create: {},
                    },
                  },
                });
              }

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Create profile for new users
      if (user.id && account) {
        const existingProfile = await db.profile.findUnique({
          where: { userId: user.id },
        });

        if (!existingProfile) {
          await db.profile.create({
            data: { userId: user.id },
          });
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'database',
  },
});

// Helper to get session in server components
export async function getSession() {
  return auth();
}

// Helper to require authentication
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session;
}
