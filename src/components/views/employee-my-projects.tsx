'use client'

import { useQuery } from '@tanstack/react-query'
import { api, fmtNumber, fmtDate } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useApp } from '@/store/app'
import { FolderOpen, Plus, Users } from 'lucide-react'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/lib/types'

const STATUS_BADGE: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  ON_HOLD: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  COMPLETED: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30',
}

export function EmployeeMyProjects() {
  const user = useApp(s => s.user)!
  const setLogDialog = useApp(s => s.setLogDialog)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects.list,
  })

  // Filter to projects where the current employee is a team member
  const myProjects = projects.filter(p => p.team.some(m => m.id === user.employeeId))

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[0,1,2].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
    </div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Projektet e mia</h2>
        <p className="text-sm text-muted-foreground">
          Je caktuar në {myProjects.length} {myProjects.length === 1 ? 'projekt' : 'projekte'}.
        </p>
      </div>

      {myProjects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="size-10 mx-auto text-muted-foreground/50" />
            <div className="mt-3 font-medium">Asnjë projekt</div>
            <div className="text-sm text-muted-foreground mt-1">
              Menaxheri yt do të të caktojë në projekte.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {myProjects.map(p => {
            const myMembership = p.team.find(m => m.id === user.employeeId)
            const pct = p.budgetHours ? Math.min(100, (p.loggedHours / p.budgetHours) * 100) : 0
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="size-11 rounded-lg shrink-0 flex items-center justify-center text-white font-bold" style={{ background: p.color }}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_BADGE[p.status]}`}>
                          {PROJECT_STATUS_LABELS[p.status]}
                        </Badge>
                        {myMembership?.role && (
                          <Badge variant="secondary" className="text-[10px]">
                            {myMembership.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  )}

                  {p.budgetHours && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Përdorimi i buxhetit</span>
                        <span className="font-medium tabular-nums">
                          {fmtNumber(p.loggedHours)} / {fmtNumber(p.budgetHours)} orë
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )}

                  {/* Team avatars */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Users className="size-3.5 text-muted-foreground" />
                    <div className="flex -space-x-1.5">
                      {p.team.slice(0, 5).map(m => (
                        <div
                          key={m.id}
                          title={m.name}
                          className="size-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center border-2 border-background"
                        >
                          {m.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
                        </div>
                      ))}
                      {p.team.length > 5 && (
                        <div className="size-6 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center border-2 border-background">
                          +{p.team.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto">{p.team.length} anëtarë</span>
                  </div>

                  {(p.startDate || p.endDate) && (
                    <div className="text-[11px] text-muted-foreground">
                      {p.startDate && fmtDate(p.startDate)}
                      {p.startDate && p.endDate && ' → '}
                      {p.endDate && fmtDate(p.endDate)}
                    </div>
                  )}

                  <Button
                    className="w-full gap-1.5"
                    size="sm"
                    onClick={() => setLogDialog(true, p.id)}
                    disabled={p.status !== 'ACTIVE'}
                  >
                    <Plus className="size-4" /> Regjistro orë për këtë projekt
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
