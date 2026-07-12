'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, fmtNumber, fmtMoney, fmtDate } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreVertical, Pencil, Trash2, Users, Mail, Phone, Briefcase } from 'lucide-react'
import type { Employee } from '@/lib/types'
import { toast } from 'sonner'

export function ManagerEmployees() {
  const qc = useQueryClient()
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: api.employees.list,
  })

  const [search, setSearch] = useState('')
  const [editEmp, setEditEmp] = useState<Employee | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = employees.filter(e => {
    if (search) {
      const q = search.toLowerCase()
      if (!e.fullName.toLowerCase().includes(q) &&
          !e.email.toLowerCase().includes(q) &&
          !(e.position || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const del = async (e: Employee) => {
    if (!confirm(`Fshi punetorin "${e.fullName}? Llogaria e përdoruesit dhe regjistrimet do të fshien.`)) return
    try {
      await api.employees.delete(e.id)
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Punetori u fshi')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0,1,2,3,4,5].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
    </div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kërko punetorë..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-4" /> Punetor i ri
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="size-10 mx-auto text-muted-foreground/50" />
            <div className="mt-3 font-medium">Asnjë punetor</div>
            <div className="text-sm text-muted-foreground mt-1">
              {search ? 'Provo të ndryshosh kërkimin.' : 'Shto punetorin e parë.'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(e => {
            const initials = e.fullName.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
            return (
              <Card key={e.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{e.fullName}</div>
                          {e.position && (
                            <div className="text-xs text-muted-foreground truncate">{e.position}</div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 shrink-0">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditEmp(e)}>
                              <Pencil className="size-4" /> Edito
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => del(e)}>
                              <Trash2 className="size-4" /> Fshi
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-1 mt-2 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="size-3" />
                          <span className="truncate">{e.email}</span>
                        </div>
                        {e.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="size-3" />
                            <span>{e.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Orë totale</div>
                      <div className="text-sm font-semibold tabular-nums">{fmtNumber(e.totalHours)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Projekte</div>
                      <div className="text-sm font-semibold">{e.assignmentsCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Tarifa/h</div>
                      <div className="text-sm font-semibold">{fmtMoney(e.hourlyRate)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    <Badge variant="outline" className="text-[10px]">
                      {e.role === 'MANAGER' ? 'Menaxher' : 'Punetor'}
                    </Badge>
                    {e.projects.slice(0, 2).map(p => (
                      <Badge key={p.id} variant="secondary" className="text-[10px] gap-1">
                        <span className="size-1.5 rounded-full" style={{ background: p.color }} />
                        {p.name}
                      </Badge>
                    ))}
                    {e.projects.length > 2 && (
                      <Badge variant="secondary" className="text-[10px]">+{e.projects.length - 2}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {editEmp && (
        <EmployeeFormDialog open={true} onOpenChange={(o) => !o && setEditEmp(null)} employee={editEmp} />
      )}
      {createOpen && (
        <EmployeeFormDialog open={true} onOpenChange={setCreateOpen} />
      )}
    </div>
  )
}

function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employee?: Employee | null
}) {
  const qc = useQueryClient()
  const [firstName, setFirstName] = useState(employee?.firstName || '')
  const [lastName, setLastName] = useState(employee?.lastName || '')
  const [email, setEmail] = useState(employee?.email || '')
  const [phone, setPhone] = useState(employee?.phone || '')
  const [position, setPosition] = useState(employee?.position || '')
  const [hourlyRate, setHourlyRate] = useState(employee ? String(employee.hourlyRate) : '15')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'MANAGER' | 'EMPLOYEE'>(employee?.role || 'EMPLOYEE')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Emri, mbiemri dhe email kërkohen')
      return
    }
    setSaving(true)
    try {
      if (employee) {
        await api.employees.update(employee.id, {
          firstName, lastName, email, phone: phone || undefined, position: position || undefined,
          hourlyRate: Number(hourlyRate) || 0, role,
        })
        toast.success('Punetori u përditësua')
      } else {
        await api.employees.create({
          firstName, lastName, email, phone: phone || undefined, position: position || undefined,
          hourlyRate: Number(hourlyRate) || 0, password: password || undefined, role,
        })
        toast.success('Punetori u krijua')
      }
      qc.invalidateQueries({ queryKey: ['employees'] })
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edito punetorin' : 'Punetor i ri'}</DialogTitle>
          <DialogDescription>
            {employee
              ? 'Përditëso të dhënat e punetorit dhe llogarinë e përdoruesit.'
              : 'Krijo punetor të ri. Do të krijohet llogaria e përdoruesit me fjalëkalimin e zgjedhur.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Emri *</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mbiemri *</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="emri@kompania.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Telefoni</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+383..." />
            </div>
            <div className="space-y-2">
              <Label>Pozita</Label>
              <Input value={position} onChange={e => setPosition(e.target.value)} placeholder="Developer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tarifa / orë (€)</Label>
              <Input type="number" min="0" step="0.5" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Roli</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Punetor</SelectItem>
                  <SelectItem value="MANAGER">Menaxher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!employee && (
            <div className="space-y-2">
              <Label>Fjalëkalimi (fshivet: 123456)</Label>
              <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="123456" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Anulo</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Duke ruajtur...' : 'Ruaj'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
