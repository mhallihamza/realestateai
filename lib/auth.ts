import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
// Explicitly importing your custom types to guarantee compatibility
import { WorkspaceRole, SubscriptionPlan, WritingTone } from '@/types'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
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

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Invalid password')
        }

        // Look for their workspace relationship assignment
        let membership = await prisma.workspaceMember.findFirst({
          where: { userId: user.id },
          include: { workspace: true }
        })

        // Edge case: If they have no workspace yet, auto-create a default one matching your exact types
        if (!membership) {
          const defaultPlan: SubscriptionPlan = 'free'
          const defaultTone: WritingTone = 'professional'
          const defaultRole: WorkspaceRole = 'owner'

          const defaultWorkspace = await prisma.workspace.create({
            data: {
              name: `${user.name || 'My'}'s Workspace`,
              slug: `workspace-${user.id}-${Date.now().toString().slice(-4)}`,
              plan: defaultPlan,
              agentConfigs: {
                create: {
                  agentName: 'AI Assistant',
                  tone: defaultTone,
                }
              }
            }
          })

          membership = await prisma.workspaceMember.create({
            data: {
              workspaceId: defaultWorkspace.id,
              userId: user.id,
              role: defaultRole,
            },
            include: { workspace: true }
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: membership.workspaceId,
          role: membership.role as WorkspaceRole,
        }
      },
    }),
  ],
  // Replace your existing callbacks block at the bottom of lib/auth.ts with this:
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.workspaceId = (user as any).workspaceId
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // Explicitly casting token properties to strings to eliminate the 'unknown' error
        (session.user as any).id = token.id as string;
        (session.user as any).workspaceId = token.workspaceId as string;
        (session.user as any).role = token.role as string;
      }
      return session
    },
  },
}