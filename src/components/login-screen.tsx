'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Clock, LogIn, Sparkles, Smartphone, Building2, BarChart3 } from 'lucide-react'
import { api } from '@/lib/api'
import { useApp } from '@/store/app'
import { toast } from 'sonner'

const DEMO_ACCOUNTS = [
  { email: 'menaxher@oraprojekt.demo', password: '123456', label: 'Lirak Berisha', role: 'Menaxher' },
  { email: 'ana@oraprojekt.demo', password: '123456', label: 'Ana Krasniqi', role: 'Punetore' },
  { email: 'bekim@oraprojekt.demo', password: '123456', label: 'Bekim Hoxha', role: 'Punetor' },
  { email: 'drita@oraprojekt.demo', password: '123456', label: 'Drita Murati', role: 'Punetore' },
]

export function LoginScreen() {
  const setUser = useApp(s => s.setUser)
  const [email, setEmail] = useState('menaxher@oraprojekt.demo')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)

  const submit = async (e?: React.FormEvent, acc?: typeof DEMO_ACCOUNTS[number]) => {
    e?.preventDefault()
    const em = acc?.email ?? email
    const pw = acc?.password ?? password
    setLoading(true)
    try {
      const u = await api.auth.login(em, pw)
      setUser(u)
      toast.success(`Mirë se erdhe, ${u.name}!`)
    } catch (err: any) {
      toast.error(err.message || 'Hyrja dështoi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — hero */}
      <div className="lg:flex-1 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="size-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Clock className="size-6" />
          </div>
          <div>
            <div className="text-xl font-bold">OraProjekt</div>
            <div className="text-xs text-white/80">Menaxhim Orësh & Projektesh</div>
          </div>
        </div>

        <div className="relative z-10 mt-8 lg:mt-0 space-y-5 max-w-xl">
          <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
            Regjistro orët,<br />menaxho projektet,<br /><ul className="text-emerald-200">shiko raportet.</ul>
          </h1>
          <p className="text-white/85 text-base lg:text-lg leading-relaxed">
            Platformë multi-tenant për ekipet që punojnë në disa projekte njëkohësisht.
            Punëtorët regjistrojnë orët nga telefoni — menaxheri i sheh në kohë reale.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/15">
              <Smartphone className="size-5 mb-2 text-emerald-200" />
              <div className="font-semibold text-sm">Mobile App</div>
              <div className="text-xs text-white/75 mt-0.5">iOS & Android — punëtorët</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/15">
              <Building2 className="size-5 mb-2 text-emerald-200" />
              <div className="font-semibold text-sm">Multi-tenant</div>
              <div className="text-xs text-white/75 mt-0.5">Secili klient — tenant</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/15">
              <BarChart3 className="size-5 mb-2 text-emerald-200" />
              <div className="font-semibold text-sm">Raporte</div>
              <div className="text-xs text-white/75 mt-0.5">Sipas projektit & stafit</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/60 mt-6 lg:mt-0">
          © 2026 OraProjekt · Demo build
        </div>
      </div>

      {/* Right — login form */}
      <div className="lg:flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Card className="border-2 shadow-xl">
            <CardHeader className="space-y-2 text-center">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <LogIn className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Hyr në llogari</CardTitle>
              <CardDescription>
                Përdor kredencialet e demo-s ose zgjidh një account nga lista.
              </CardDescription>
            </CardHeader>
            <form onSubmit={submit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="emri@kompania.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Fjalëkalimi</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Duke hyrë...' : 'Hyr'}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="mt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Sparkles className="size-3.5" />
              <span>Llogari demo — kliko për hyrje të shpejtë</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  onClick={(e) => submit(e, acc)}
                  disabled={loading}
                  className="text-left p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-accent/50 transition-colors disabled:opacity-50"
                >
                  <div className="text-sm font-medium truncate">{acc.label}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block size-1.5 rounded-full bg-primary" />
                    {acc.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
