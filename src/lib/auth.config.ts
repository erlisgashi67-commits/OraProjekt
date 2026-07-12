// NextAuth v5 (Auth.js) configuration
// Supports: Google OAuth, Microsoft Entra ID, and Credentials (demo) providers
// Tenant resolution: email domain → TenantDomain lookup → auto-assign
//
// NOTE: This file is lazy-loaded only when NextAuth endpoints are hit.
// It's kept separate from auth.ts to avoid loading OAuth providers on every request.
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Microsoft from 'next-auth/providers/microsoft-entra-id'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'

type SessionUser = {
  id: string
  email: string
  name: string
  role: 'MANAGER' | 'EMPLOYEE'
  tenantId: string
  tenantName: string
  employeeId: string | null
  image?: string | null
}

const SECRET = process.env.AUTH_SECRET || 'oraprojekt-dev-secret-2026'

// Resolve tenant from email domain
async function resolveTenantFromEmail(email: string): Promise<{ tenantId: string; tenantName: string } | null> {
  const domain = email.toLowerCase().split('@')[1]
  if (!domain) return null

  const mapping = await db.tenantDomain.findFirst({
    where: { domain, status: 'ACTIVE' },
    include: { tenant: { select: { id: true, name: true } } },
  })

  if (mapping) {
    return { tenantId: mapping.tenant.id, tenantName: mapping.tenant.name }
  }

  return null
}

// Find or create a user from OAuth sign-in
async function findOrCreateOAuthUser({
  email,
  name,
  image,
  provider,
  providerAccountId,
}: {
  email: string
  name: string
  image?: string | null
  provider: string
  providerAccountId: string
}): Promise<SessionUser> {
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Check if user already exists
  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { tenant: true, employee: true, accounts: true },
  })

  if (existing) {
    // Link OAuth account if not already linked
    const hasAccount = existing.accounts.some(a => a.provider === provider && a.providerAccountId === providerAccountId)
    if (!hasAccount) {
      await db.account.create({
        data: {
          userId: existing.id,
          type: 'oauth',
          provider,
          providerAccountId,
        },
      })
    }
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      role: existing.role as 'MANAGER' | 'EMPLOYEE',
      tenantId: existing.tenantId,
      tenantName: existing.tenant.name,
      employeeId: existing.employee?.id ?? null,
    }
  }

  // 2. New user — resolve tenant from email domain
  const tenantInfo = await resolveTenantFromEmail(normalizedEmail)
  if (!tenantInfo) {
    throw new Error(`Nuk ka tenant të regjistruar për domenin "@${normalizedEmail.split('@')[1]}". Kërko një ftesë nga admini i organizatës.`)
  }

  // 3. Create user + link OAuth account
  const newUser = await db.user.create({
    data: {
      email: normalizedEmail,
      name,
      image: image || null,
      password: null,
      role: 'EMPLOYEE',
      tenantId: tenantInfo.tenantId,
      emailVerified: new Date(),
      accounts: {
        create: {
          type: 'oauth',
          provider,
          providerAccountId,
        },
      },
    },
    include: { tenant: true, employee: true },
  })

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role as 'MANAGER' | 'EMPLOYEE',
    tenantId: newUser.tenantId,
    tenantName: newUser.tenant.name,
    employeeId: newUser.employee?.id ?? null,
  }
}

// Only configure Google/Microsoft if env vars are set
const providers: any[] = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
  }))
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  providers.push(Microsoft({
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    tenant: 'common',
    allowDangerousEmailAccountLinking: true,
  }))
}

// Always include Credentials provider for demo logins
providers.push(Credentials({
  name: 'Demo',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    const email = credentials?.email as string
    const password = credentials?.password as string
    if (!email || !password) return null

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { tenant: true, employee: true },
    })

    if (!user || !user.password || user.password !== password) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      employeeId: user.employee?.id ?? null,
    } as any
  },
}))

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: SECRET,
  trustHost: true,
  pages: {
    signIn: '/',
    error: '/',
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any
        token.id = u.id
        token.role = u.role
        token.tenantId = u.tenantId
        token.tenantName = u.tenantName
        token.employeeId = u.employeeId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          image: token.image as string | null,
          role: token.role as 'MANAGER' | 'EMPLOYEE',
          tenantId: token.tenantId as string,
          tenantName: token.tenantName as string,
          employeeId: token.employeeId as string | null,
        } as any
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true

      if (account?.provider && (account.provider === 'google' || account.provider === 'azure-ad') && user?.email) {
        try {
          const sessionUser = await findOrCreateOAuthUser({
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          })
          ;(user as any).role = sessionUser.role
          ;(user as any).tenantId = sessionUser.tenantId
          ;(user as any).tenantName = sessionUser.tenantName
          ;(user as any).employeeId = sessionUser.employeeId
          ;(user as any).id = sessionUser.id
          return true
        } catch (e: any) {
          console.error('OAuth sign-in failed:', e.message)
          return `/api/auth/error?error=${encodeURIComponent(e.message)}`
        }
      }

      return true
    },
  },
})
