'use client'

import { create } from 'zustand'
import type { SessionUser } from '@/lib/types'

export type View =
  | 'dashboard'
  | 'projects'
  | 'employees'
  | 'timesheets'
  | 'reports'
  | 'my-hours'
  | 'my-projects'
  | 'settings'

type AppState = {
  user: SessionUser | null
  setUser: (u: SessionUser | null) => void
  view: View
  setView: (v: View) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  logDialogOpen: boolean
  setLogDialogOpen: (open: boolean) => void
  logDialogProjectId?: string
  setLogDialog: (open: boolean, projectId?: string) => void
}

export const useApp = create<AppState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  view: 'dashboard',
  setView: (v) => set({ view: v, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  logDialogOpen: false,
  setLogDialogOpen: (open) => set({ logDialogOpen: open }),
  logDialogProjectId: undefined,
  setLogDialog: (open, projectId) =>
    set({ logDialogOpen: open, logDialogProjectId: projectId }),
}))
