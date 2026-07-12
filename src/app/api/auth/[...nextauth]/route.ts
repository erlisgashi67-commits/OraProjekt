// NextAuth v5 catch-all route handler
// Mounts all auth endpoints: /api/auth/signin, /api/auth/signout, /api/auth/callback/*, etc.
import { handlers } from '@/lib/auth.config'

export const { GET, POST } = handlers
