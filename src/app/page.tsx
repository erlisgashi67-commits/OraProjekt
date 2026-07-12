'use client'

import { useEffect, useState } from 'react'
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/lib/api'
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

  // Restore session on mount
  useEffect(() => {
    let cancelled = false
    api.auth.me()
      .then(u => { if (!cancelled) setUser(u) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBooted(true) })
    return () => { cancelled = true }
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
        // Fallback — if employee somehow ends up on manager views, send them to my-hours
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
