'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/store/app'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from 'next-themes'
import { Building2, User, Shield, Palette, Smartphone, Globe, LogOut, Sun, Moon, Monitor } from 'lucide-react'
import { api, clearToken } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function SettingsView() {
  const user = useApp(s => s.user)
  const setUser = useApp(s => s.setUser)
  const { theme, setTheme } = useTheme()
  const qc = useQueryClient()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Defensive: if user becomes null mid-render, render nothing
  if (!user) return null

  const initials = (user.name || '').split(' ').map(n => n?.[0] ?? '').filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'

  const logout = async () => {
    try {
      await api.auth.logout()
    } catch (e) {
      console.warn('Logout API call failed', e)
    }
    clearToken()
    qc.clear()
    setUser(null)
    toast.success('Dole nga llogaria')
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold">Cilësimet</h2>
        <p className="text-sm text-muted-foreground">Profili, tema dhe informacione tenant-i.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" /> Profili
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-semibold">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <Badge variant="outline" className="mt-1 text-xs">
                {user.role === 'MANAGER' ? 'Menaxher' : 'Punetor'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-4" /> Tenant / Organizata
          </CardTitle>
          <CardDescription>
            OraProjekt është sistem multi-tenant. Çdo organizatë është një tenant i izoluar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-accent/50 border">
              <div className="text-[10px] text-muted-foreground uppercase">Emri</div>
              <div className="font-semibold">{user.tenantName}</div>
            </div>
            <div className="p-3 rounded-lg bg-accent/50 border">
              <div className="text-[10px] text-muted-foreground uppercase">Tenant ID</div>
              <div className="font-mono text-xs">{user.tenantId}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="size-4" /> Paraqitja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm font-medium">Tema</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'E çelur', icon: Sun },
              { id: 'dark', label: 'E errët', icon: Moon },
              { id: 'system', label: 'Sistemi', icon: Monitor },
            ].map(t => {
              const Icon = t.icon
              const active = mounted && theme === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors ${
                    active ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Icon className="size-4" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Architecture info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4" /> Arkitektura & Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <InfoRow icon={Building2} label="Multi-tenant" value="Nivel aplikacioni" />
            <InfoRow icon={Globe} label="API" value="REST · Next.js Route Handlers" />
            <InfoRow icon={Smartphone} label="Mobile" value="iOS & Android (PWA installable)" />
            <InfoRow icon={Shield} label="Auth" value="Token + Cookie session" />
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="p-4">
          <Button variant="destructive" className="w-full gap-2" onClick={logout}>
            <LogOut className="size-4" /> Dil nga llogaria
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center pt-2">
        OraProjekt v1.0 · Demo build · {new Date().getFullYear()}
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/40 border">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  )
}
