'use client'

import { useEffect, useState } from 'react'
import { useApp, type View } from '@/store/app'
import { api, clearToken } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { LogOut, Clock, Plus, Moon, Sun, Menu, Building2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CalendarClock,
  BarChart3,
  Hourglass,
  FolderOpen,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const MANAGER_NAV: { id: View; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Paneli', icon: LayoutDashboard },
  { id: 'projects', label: 'Projektet', icon: FolderKanban },
  { id: 'employees', label: 'Punetorët', icon: Users },
  { id: 'timesheets', label: 'Regjistrimet', icon: CalendarClock },
  { id: 'reports', label: 'Raportet', icon: BarChart3 },
]

const EMPLOYEE_NAV: { id: View; label: string; icon: any }[] = [
  { id: 'my-hours', label: 'Orët e mia', icon: Hourglass },
  { id: 'my-projects', label: 'Projektet e mia', icon: FolderOpen },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useApp(s => s.user)
  const view = useApp(s => s.view)
  const setView = useApp(s => s.setView)
  const sidebarOpen = useApp(s => s.sidebarOpen)
  const setSidebarOpen = useApp(s => s.setSidebarOpen)
  const setLogDialog = useApp(s => s.setLogDialog)
  const setUser = useApp(s => s.setUser)
  const qc = useQueryClient()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // theme mounted flag must run after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Defensive: if user becomes null (e.g. during logout), render nothing.
  // The parent Boot component will switch to LoginScreen.
  if (!user) return null

  const nav = user.role === 'MANAGER' ? MANAGER_NAV : EMPLOYEE_NAV

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

  // Safe initials computation — handles empty names gracefully
  const initials = (user.name || '')
    .split(' ')
    .map(n => n?.[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
            <Clock className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold leading-tight">OraProjekt</div>
            <div className="text-[10px] text-muted-foreground leading-tight">v1.0 · Demo</div>
          </div>
        </div>
      </div>

      {/* Tenant badge */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/60 border border-border">
          <Building2 className="size-4 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Tenant</div>
            <div className="text-sm font-medium truncate">{user.tenantName}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
        {nav.map(item => {
          const Icon = item.icon
          const active = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}

        <button
          onClick={() => setView('settings')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-4',
            view === 'settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Settings className="size-4 shrink-0" />
          <span>Cilësimet</span>
        </button>
      </nav>

      {/* User card */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={logout}
            title="Dil"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b safe-pt">
        <div className="flex items-center justify-between px-3 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            onClick={() => setSidebarOpen(true)}
            aria-label="Hap menunë"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold">OraProjekt</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            onClick={() => setLogDialog(true)}
            aria-label="Regjistro orë"
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r bg-sidebar/40 flex-col">
          {SidebarContent}
        </aside>

        {/* Mobile drawer */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menyja</SheetTitle>
            </SheetHeader>
            {SidebarContent}
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Desktop top bar */}
          <header className="hidden lg:flex sticky top-0 z-20 h-14 border-b bg-background/95 backdrop-blur items-center justify-between px-6">
            <div>
              <h1 className="text-base font-semibold">
                {nav.find(n => n.id === view)?.label || (view === 'settings' ? 'Cilësimet' : '')}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title="Ndrysho temën"
                aria-label="Ndrysho temën"
              >
                {mounted && theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
              <Button onClick={() => setLogDialog(true)} size="sm" className="gap-1.5">
                <Plus className="size-4" />
                <span>Regjistro Orë</span>
              </Button>
            </div>
          </header>

          {/* Mobile floating action button */}
          <Button
            onClick={() => setLogDialog(true)}
            size="icon"
            className="lg:hidden fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-2xl"
            title="Regjistro Orë"
          >
            <Plus className="size-6" />
          </Button>

          <div className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
            {children}
          </div>

          {/* Footer */}
          <footer className="mt-auto border-t bg-card/30 px-4 lg:px-6 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-1 safe-pb">
            <div className="flex items-center gap-2">
              <Clock className="size-3.5" />
              <span>OraProjekt · Sistem multi-tenant për menaxhim orësh</span>
            </div>
            <div className="flex items-center gap-3">
              <span>© 2026 OraProjekt</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
