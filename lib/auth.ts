import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
// Explicitly importing your custom types to guarantee compatibility
import { WorkspaceRole, SubscriptionPlan, WritingTone } from '@/types'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('No account found with this email')
        }

        // 🔐 BLOCK PENDING VERIFICATION
        if (user.accountStatus === 'pending_verification') {
          throw new Error('Please verify your email before logging in. Check your inbox for the verification link.')
        }

        // 🔐 BLOCK SUSPENDED USERS
        if (user.accountStatus === 'suspended') {
          throw new Error('Your account has been suspended. Please contact support.')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Invalid password')
        }

        // Find their workspace membership
        const membership = await prisma.workspaceMember.findFirst({
          where: { userId: user.id },
          include: { workspace: true }
        })

        // If verified but no workspace exists yet, flag for onboarding
        if (!membership) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            workspaceId: null,
            role: null,
            needsOnboarding: true,
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: membership.workspaceId,
          role: membership.role as WorkspaceRole,
          needsOnboarding: false,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign in, store user data in the token
      if (user) {
        token.id = user.id
        token.workspaceId = (user as any).workspaceId
        token.role = (user as any).role
        token.needsOnboarding = (user as any).needsOnboarding
      }

      // If the token was updated via update() trigger (e.g. after onboarding),
      // or on any subsequent JWT read: re-query membership from DB
      // This ensures the session is always up-to-date with the current workspace
      if (token.id && (trigger === 'update' || !user)) {
        const membership = await prisma.workspaceMember.findFirst({
          where: { userId: token.id as string },
          select: {
            workspaceId: true,
            role: true,
          }
        })

        if (membership) {
          token.workspaceId = membership.workspaceId
          token.role = membership.role
          token.needsOnboarding = false
        } else {
          // Still no workspace — user still needs onboarding
          token.workspaceId = null
          token.role = null
          token.needsOnboarding = true
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).workspaceId = token.workspaceId as string;
        (session.user as any).role = token.role as string;
        (session.user as any).needsOnboarding = token.needsOnboarding as boolean;
      }
      return session
    },
  },
}