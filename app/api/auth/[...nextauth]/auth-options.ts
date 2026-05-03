// auth-options.ts
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from '../../../../src/lib/prisma';
import type { DefaultSession, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { AdapterUser } from "next-auth/adapters";

// DefaultSession'ı genişlet
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      settings?: any;
      isAdmin?: boolean;
    } & DefaultSession["user"]
  }
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" as const },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true, // Autorise la liaison de compte si l'email existe déjà
    }),
    CredentialsProvider({
      name: "Local Test",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@dj.com" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        
        let user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: "Test DJ",
            }
          });
        }
        
        return user as any;
      }
    }),
  ],
  pages: {
    signIn: '/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token, user }: { session: Session; token: JWT; user: AdapterUser }) {
      if (session.user) {
        session.user.id = token?.sub || user?.id;
        
        const dbUser = await prisma.user.findUnique({
          where: { id: session.user.id }
        });
        
        const djSettings = await prisma.dJSettings.findUnique({
          where: { userId: session.user.id }
        });
        
        session.user.settings = djSettings;
        session.user.isAdmin = dbUser?.isAdmin || false;
      }
      return session;
    },
  
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.includes('/signin') || url === baseUrl) {
        return `${baseUrl}/dashboard`;
      }
      return url;
    },
  },
};