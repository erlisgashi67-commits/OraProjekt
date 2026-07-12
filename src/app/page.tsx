'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api, clearToken } from '@/lib/api'
import { useApp } from '@/store/app'
import { LoginScreen } from '@/components/login-screen'
import { AppShell } from '@/components/app-shell'
import { ManagerDashboard } from '@/components/views/manager-dashboard'
import { ManagerProjects } from '@/components/views/manager-projects'
import { ManagerEmployees } from '@/components/views/manager-employees'
import { ManagerTimesheets } from '@/components/views/manager-timesheets'
import { ManagerReports } from '@/components/views/manager-reports'
import { EmployeeMyHours } from '@/components/views/employee-my-hours'
import { EmployeeMyProjects } from '@/components/views/employee-my-projects'
import { SettingsView } from '@/components/views/settings-view'
import { LogTimeDialog } from '@/components/log-time-dialog'
import { Clock } from 'lucide-react'
import { toast } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function Boot() {
  const user = useApp(s => s.user)
  const setUser = useApp(s => s.setUser)
  const view = useApp(s => s.view)
  const logDialogOpen = useApp(s => s.logDialogOpen)
  const setLogDialog = useApp(s => s.setLogDialog)
  const logDialogProjectId = useApp(s => s.logDialogProjectId)
  const [booted, setBooted] = useState(false)

  // Restore session on mount — only if we have a token in localStorage
  useEffect(() => {
    let cancelled = false
    const token = typeof window !== 'undefined' ? localStorage.getItem('op_token') : null
    if (!token) {
      // No token — skip API call, go straight to login
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBooted(true)
      return
    }
    api.auth.me()
      .then(u => { if (!cancelled) setUser(u) })
      .catch(() => {
        // Token might be stale — clean up
        if (typeof window !== 'undefined') clearToken()
      })
      .finally(() => { if (!cancelled) setBooted(true) })
    return () => { cancelled = true }
  }, [setUser])

  // Listen for 401 events from the API client — auto-logout
  useEffect(() => {
    const handler = () => {
      setUser(null)
      queryClient.clear()
      clearToken()
      toast.error('Sesioni ka skaduar. Ju lutemi hyni përsëri.')
    }
    window.addEventListener('op:unauthorized', handler)
    return () => window.removeEventListener('op:unauthorized', handler)
  }, [setUser])

  if (!booted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <Clock className="size-6 text-primary-foreground" />
          </div>
          <div className="text-sm text-muted-foreground">Duke ngarkuar OraProjekt...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  const renderView = () => {
    if (user.role === 'MANAGER') {
      switch (view) {
        case 'dashboard': return <ManagerDashboard />
        case 'projects': return <ManagerProjects />
        case 'employees': return <ManagerEmployees />
        case 'timesheets': return <ManagerTimesheets />
        case 'reports': return <ManagerReports />
        case 'settings': return <SettingsView />
        default: return <ManagerDashboard />
      }
    } else {
      switch (view) {
        case 'my-hours': return <EmployeeMyHours />
        case 'my-projects': return <EmployeeMyProjects />
        case 'settings': return <SettingsView />
        case 'dashboard':
        case 'projects':
        case 'employees':
        case 'timesheets':
        case 'reports':
          return <EmployeeMyHours />
        default: return <EmployeeMyHours />
      }
    }
  }

  return (
    <AppShell>
      {renderView()}
      <LogTimeDialog
        open={logDialogOpen}
        onOpenChange={(o) => setLogDialog(o, undefined)}
        presetProjectId={logDialogProjectId}
      />
    </AppShell>
  )
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <Boot />
    </QueryClientProvider>
  )
}
