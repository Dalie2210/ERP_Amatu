"use client"

import { useEffect, useState, useCallback } from "react"
import { ArrowLeft, Plus, UserCheck, UserX } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import type { UserRole } from "@/types"

interface UserRow {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  vendedor: "Vendedor",
  logistica: "Logística",
  contable: "Contable",
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "border-purple-200 text-purple-700",
  vendedor: "border-blue-200 text-blue-700",
  logistica: "border-orange-200 text-orange-700",
  contable: "border-green-200 text-green-700",
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [noEmail, setNoEmail] = useState(false)

  // Create dialog state
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ email: "", full_name: "", role: "vendedor" as UserRole, password: "" })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const res = await fetch("/api/admin/usuarios")
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users ?? [])
      setNoEmail(data.noEmail ?? false)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleCreate = async () => {
    if (!createForm.email || !createForm.full_name || !createForm.password) {
      setCreateError("Todos los campos son requeridos.")
      return
    }
    setIsCreating(true)
    setCreateError(null)
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error ?? "Error al crear usuario.")
    } else {
      toast.success(`Usuario ${createForm.email} creado.`)
      setShowCreate(false)
      setCreateForm({ email: "", full_name: "", role: "vendedor", password: "" })
      await fetchUsers()
    }
    setIsCreating(false)
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const res = await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role: newRole }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
      toast.success("Rol actualizado.")
    } else {
      toast.error("Error actualizando rol.")
    }
  }

  const handleToggleActive = async (user: UserRow) => {
    const res = await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      toast.success(user.is_active ? "Usuario desactivado." : "Usuario activado.")
    } else {
      toast.error("Error al actualizar usuario.")
    }
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2 mt-0.5">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Usuarios</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Gestión de cuentas y roles del sistema.
              {noEmail && <span className="ml-1 text-amber-600">(Sin SUPABASE_SERVICE_ROLE_KEY — el correo no se muestra)</span>}
            </p>
          </div>
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger render={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo Usuario
            </Button>
          } />
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-heading">Crear Usuario</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre Completo *</Label>
                <Input
                  placeholder="María García"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Correo *</Label>
                <Input
                  type="email"
                  placeholder="usuario@amatu.co"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña temporal *</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v: string | null) => setCreateForm({ ...createForm, role: (v ?? "vendedor") as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol">
                      {ROLE_LABELS[createForm.role]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="logistica">Logística</SelectItem>
                    <SelectItem value="contable">Contable</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <p className="text-sm">No hay usuarios registrados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nombre</TableHead>
                  {!noEmail && <TableHead>Correo</TableHead>}
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    {!noEmail && (
                      <TableCell className="text-sm text-muted-foreground font-mono">{u.email}</TableCell>
                    )}
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v: string | null) => handleRoleChange(u.id, (v ?? "vendedor") as UserRole)}
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue>
                            <Badge variant="outline" className={`text-[10px] h-5 ${ROLE_COLORS[u.role]}`}>
                              {ROLE_LABELS[u.role] ?? u.role}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                          <SelectItem value="logistica">Logística</SelectItem>
                          <SelectItem value="contable">Contable</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={u.is_active
                          ? "border-emerald-200 text-emerald-700"
                          : "border-slate-200 text-slate-500"}
                      >
                        {u.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={u.is_active ? "text-destructive hover:text-destructive gap-1" : "gap-1"}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.is_active
                          ? <><UserX className="h-3.5 w-3.5" />Desactivar</>
                          : <><UserCheck className="h-3.5 w-3.5" />Activar</>
                        }
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
