'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, fmtHours, fmtNumber, fmtMoney, fmtDate, fmtDateShort } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Download, CalendarRange, BarChart3, PieChart as PieIcon, Users, FolderKanban } from 'lucide-react'

const RANGES = [
  { id: '30', label: '30 ditë', days: 30 },
  { id: '90', label: '90 ditë', days: 90 },
  { id: '365', label: '1 vit', days: 365 },
]

export function ManagerReports() {
  const [rangeId, setRangeId] = useState('30')
  const range = RANGES.find(r => r.id === rangeId)!
  const from = new Date()
  from.setDate(from.getDate() - range.days)
  const fromStr = from.toISOString().slice(0, 10)

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'summary', fromStr],
    queryFn: () => api.reports.summary({ from: fromStr }),
  })

  if (isLoading || !report) {
    return <div className="space-y-4">
      <div className="h-10 w-72 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    </div>
  }

  const s = report.summary
  const projectPieData = report.byProject.map(p => ({ name: p.name, value: p.hours, color: p.color }))
  const totalHoursAll = projectPieData.reduce((sum, d) => sum + d.value, 0)

  const exportCsv = () => {
    const rows = [
      ['Data', 'Punetori', 'Projekti', 'Orë', 'Tarifa/h', 'Kosto', 'Statusi', 'Përshkrimi'],
    ]
    // we can include byEmployee aggregated data for simplicity
    for (const e of report.byEmployee) {
      rows.push(['—', e.name, '—', String(e.hours), String(e.hourlyRate), String(e.cost), '—', `${e.entries} regjistrime`])
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `oraprojekt-raport-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Raporte</h2>
          <p className="text-sm text-muted-foreground">
            Raport mujor për stafin — sipas projektit dhe punetorit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setRangeId(r.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  rangeId === r.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="size-4" /> CSV
          </Button>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Orë</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{fmtNumber(s.totalHours)}</div>
            <div className="text-[11px] text-muted-foreground">{s.totalEntries} regjistrime</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Projekte Aktive</div>
            <div className="text-2xl font-bold mt-1">{s.activeProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Punetorë</div>
            <div className="text-2xl font-bold mt-1">{s.totalEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Për Aprovim</div>
            <div className="text-2xl font-bold tabular-nums mt-1 text-amber-600">{s.pendingApprovals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Kosto Totale</div>
            <div className="text-2xl font-bold tabular-nums mt-1">
              {fmtMoney(report.byEmployee.reduce((sum, e) => sum + e.cost, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="project" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="project" className="gap-1.5">
            <FolderKanban className="size-4" /> Sipas projektit
          </TabsTrigger>
          <TabsTrigger value="employee" className="gap-1.5">
            <Users className="size-4" /> Sipas punetorit
          </TabsTrigger>
        </TabsList>

        {/* By Project */}
        <TabsContent value="project" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="size-4" /> Orët sipas projektit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.byProject} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                      />
                      <Tooltip
                        contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any) => [fmtHours(v as number), 'Orë']}
                      />
                      <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                        {report.byProject.map((p, i) => (
                          <Cell key={i} fill={p.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieIcon className="size-4" /> Përdarja sipas projektit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  {projectPieData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Asnjë të dhënë</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={(d: any) => `${((d.value / totalHoursAll) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {projectPieData.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          formatter={(v: any, n: any) => [fmtHours(v as number), n]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detaje sipas projektit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2 font-medium">Projekti</th>
                      <th className="pb-2 font-medium text-right">Orët</th>
                      <th className="pb-2 font-medium text-right">Buxheti</th>
                      <th className="pb-2 font-medium">Përdorimi</th>
                      <th className="pb-2 font-medium text-right">Regjistrime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.byProject.map(p => {
                      const pct = p.budgetHours ? Math.min(100, (p.hours / p.budgetHours) * 100) : 0
                      return (
                        <tr key={p.projectId}>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="size-2.5 rounded-full" style={{ background: p.color }} />
                              <span className="font-medium">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-semibold">{fmtNumber(p.hours)}</td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                            {p.budgetHours ? fmtNumber(p.budgetHours) : '—'}
                          </td>
                          <td className="py-2.5">
                            {p.budgetHours ? (
                              <div className="flex items-center gap-2 w-32">
                                <Progress value={pct} className="h-1.5" />
                                <span className="text-[11px] text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">{p.entries}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Employee */}
        <TabsContent value="employee" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="size-4" /> Orët sipas punetorit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {report.byEmployee.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Asnjë të dhënë</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.byEmployee} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any, n: any) => n === 'hours' ? [fmtHours(v as number), 'Orë'] : [fmtMoney(v as number), 'Kosto']}
                      />
                      <Bar dataKey="hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detaje sipas punetorit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2 font-medium">Punetori</th>
                      <th className="pb-2 font-medium">Pozita</th>
                      <th className="pb-2 font-medium text-right">Orët</th>
                      <th className="pb-2 font-medium text-right">Tarifa</th>
                      <th className="pb-2 font-medium text-right">Kosto</th>
                      <th className="pb-2 font-medium text-right">Regjistrime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.byEmployee.map(e => (
                      <tr key={e.employeeId}>
                        <td className="py-2.5 font-medium">{e.name}</td>
                        <td className="py-2.5 text-muted-foreground text-xs">{e.position || '—'}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold">{fmtNumber(e.hours)}</td>
                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtMoney(e.hourlyRate)}/h</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold">{fmtMoney(e.cost)}</td>
                        <td className="py-2.5 text-right tabular-nums">{e.entries}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="pt-2.5" colSpan={2}>Total</td>
                      <td className="pt-2.5 text-right tabular-nums">
                        {fmtNumber(report.byEmployee.reduce((s, e) => s + e.hours, 0))}
                      </td>
                      <td></td>
                      <td className="pt-2.5 text-right tabular-nums">
                        {fmtMoney(report.byEmployee.reduce((s, e) => s + e.cost, 0))}
                      </td>
                      <td className="pt-2.5 text-right tabular-nums">
                        {report.byEmployee.reduce((s, e) => s + e.entries, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
