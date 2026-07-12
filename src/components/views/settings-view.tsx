'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApp } from '@/store/app'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'
import {
  Building2, User, Shield, Palette, Smartphone, Globe, LogOut, Sun, Moon, Monitor,
  Plus, Trash2, CheckCircle2, XCircle, Mail, AlertCircle,
} from 'lucide-react'
import { api, clearToken } from '@/lib/api'
import { TENANT_DOMAIN_STATUS_LABELS, type TenantDomainStatus } from '@/lib/types'
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

  // Google sign-in — redirects to NextAuth Google provider
  const signInWithGoogle = () => {
    window.location.href = '/api/auth/signin/google'
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

          {/* OAuth account linking */}
          <div className="pt-4 border-t space-y-2">
            <div className="text-sm font-medium">Llogaria OAuth</div>
            <p className="text-xs text-muted-foreground">
              Lidh llogarinë tënde të Google për hyrje më të shpejtë dhe më të sigurt.
            </p>
            <Button variant="outline" onClick={signInWithGoogle} className="gap-2 w-full sm:w-auto">
              <GoogleIcon className="size-4" />
              Hyr me Google
            </Button>
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

      {/* Tenant Domains — only managers can manage */}
      {user.role === 'MANAGER' && <TenantDomainsSection />}

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
            <InfoRow icon={Shield} label="Auth" value="NextAuth + Token + Cookie" />
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

// === Tenant Domains Section ===
function TenantDomainsSection() {
  const qc = useQueryClient()
  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['tenant-domains'],
    queryFn: api.tenantDomains.list,
  })
  const [newDomain, setNewDomain] = useState('')
  const [adding, setAdding] = useState(false)

  const addDomain = async () => {
    if (!newDomain.trim()) return
    setAdding(true)
    try {
      await api.tenantDomains.create(newDomain)
      qc.invalidateQueries({ queryKey: ['tenant-domains'] })
      setNewDomain('')
      toast.success('Domeni u shtua — në pritje të verifikimit')
    } catch (e: any) {
      toast.error(e.message || 'Gabim')
    } finally {
      setAdding(false)
    }
  }

  const verifyDomain = async (id: string, status: 'ACTIVE' | 'REJECTED') => {
    try {
      await api.tenantDomains.verify(id, status)
      qc.invalidateQueries({ queryKey: ['tenant-domains'] })
      toast.success(status === 'ACTIVE' ? 'Domeni u aktivizua' : 'Domeni u refuzua')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const deleteDomain = async (id: string) => {
    if (!confirm('Fshi këtë domen?')) return
    try {
      await api.tenantDomains.delete(id)
      qc.invalidateQueries({ queryKey: ['tenant-domains'] })
      toast.success('Domeni u fshi')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="size-4" /> Domenet e Email-it
        </CardTitle>
        <CardDescription>
          Përdoruesit që hyjnë me Google/Microsoft nga këto domene do të caktohen automatikisht te ky tenant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add domain form */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="p.sh. kompania-ks.com"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDomain()}
            disabled={adding}
          />
          <Button onClick={addDomain} disabled={adding || !newDomain.trim()} className="gap-1.5 shrink-0">
            <Plus className="size-4" /> Shto
          </Button>
        </div>

        {/* Domains list */}
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
            <AlertCircle className="size-5 mx-auto mb-1.5 opacity-50" />
            Asnjë domen i regjistruar. Shto domenin e organizatës për hyrje automatike.
          </div>
        ) : (
          <div className="space-y-2">
            {domains.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Globe className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{d.domain}</div>
                  <div className="text-xs text-muted-foreground">
                    {TENANT_DOMAIN_STATUS_LABELS[d.status as TenantDomainStatus]}
                    {d.verifiedAt && ` · ${new Date(d.verifiedAt).toLocaleDateString('sq-AL')}`}
                  </div>
                </div>
                <DomainStatusBadge status={d.status as TenantDomainStatus} />
                {d.status === 'PENDING' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-8 p-0 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => verifyDomain(d.id, 'ACTIVE')}
                      title="Aktivizo"
                    >
                      <CheckCircle2 className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-8 p-0 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                      onClick={() => verifyDomain(d.id, 'REJECTED')}
                      title="Refuzo"
                    >
                      <XCircle className="size-4" />
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteDomain(d.id)}
                  title="Fshi"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-dashed">
          <strong className="text-foreground">Si funksionon:</strong> Kur një përdorues hyr me Google
          ose Microsoft me email p.sh. <code className="bg-background px-1 rounded">ana@kompania-ks.com</code>,
          sistemi kërkon domenin <code className="bg-background px-1 rounded">kompania-ks.com</code> në
          listë dhe e cakton automatikisht te ky tenant.
        </div>
      </CardContent>
    </Card>
  )
}

function DomainStatusBadge({ status }: { status: TenantDomainStatus }) {
  const styles: Record<TenantDomainStatus, string> = {
    PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  }
  return (
    <Badge variant="outline" className={`text-[10px] ${styles[status]}`}>
      {TENANT_DOMAIN_STATUS_LABELS[status]}
    </Badge>
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

// Google SVG icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
