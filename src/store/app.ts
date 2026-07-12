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
  // When user is set, also reset the view based on role to avoid stale view state
  setUser: (u) =>
    set((state) => {
      // If user changed (different id) or role changed, reset view to a sensible default
      const userChanged = !state.user || (u && state.user && u.id !== state.user.id)
      const roleChanged = u && state.user && u.role !== state.user.role
      if (userChanged || roleChanged) {
        const defaultView: View = u?.role === 'MANAGER' ? 'dashboard' : 'my-hours'
        return { user: u, view: defaultView, sidebarOpen: false }
      }
      return { user: u }
    }),
  view: 'dashboard',
  setView: (v) => set({ view: v, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  logDialogOpen: false,
  setLogDialogOpen: (open) => set({ logDialogOpen: open }),
  logDialogProjectId: undefined,
  // Clear projectId when closing so next open doesn't reuse a stale value
  setLogDialog: (open, projectId) =>
    set({ logDialogOpen: open, logDialogProjectId: open ? projectId : undefined }),
}))
