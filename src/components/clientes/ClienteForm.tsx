"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { generateCodigoCliente } from "@/lib/clientes/codigo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PawPrint, Plus, Trash2, User } from "lucide-react"
import type {
  TipoDocumento,
  TipoCliente,
  FuenteCliente,
} from "@/types"

interface ZonaEnvio {
  id: string
  nombre: string
}

export interface ClienteFormResult {
  cliente: {
    id: string
    codigo_cliente: string
    nombre_completo: string
    celular: string
    direccion: string
    complemento_direccion: string | null
    zona_id: string | null
    tipo_cliente: TipoCliente
    pct_descuento_distribuidor: number
  }
  mascotas: { id: string; nombre: string; raza: string | null; peso_kg: number | null }[]
}

export interface ClienteFormProps {
  defaultNombre?: string
  defaultZonaId?: string
  onCreated: (result: ClienteFormResult) => void
  onCancel?: () => void
}

interface MascotaInput {
  nombre: string
  raza: string
  peso_kg: string
  edad_meses: string
  necesidad_dolor: string
}

const emptyMascota = (): MascotaInput => ({
  nombre: "",
  raza: "",
  peso_kg: "",
  edad_meses: "",
  necesidad_dolor: "",
})

export function ClienteForm({
  defaultNombre = "",
  defaultZonaId = "",
  onCreated,
  onCancel,
}: ClienteFormProps) {
  const supabase = useMemo(() => createClient(), [])
  const [zonas, setZonas] = useState<ZonaEnvio[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState({
    nombre_completo: defaultNombre,
    tipo_documento: "CC" as TipoDocumento,
    numero_documento: "",
    celular: "",
    correo: "",
    direccion: "",
    complemento_direccion: "",
    zona_id: defaultZonaId,
    fuente: "otro" as FuenteCliente,
    fuente_subtipo: "",
    tipo_cliente: "publico" as TipoCliente,
  })

  const [mascotas, setMascotas] = useState<MascotaInput[]>([emptyMascota()])

  useEffect(() => {
    const fetchZonas = async () => {
      const { data } = await supabase
        .from("zonas_envio")
        .select("id, nombre")
        .eq("is_active", true)
        .order("nombre")
      if (data) setZonas(data)
    }
    fetchZonas()
  }, [supabase])

  const isReferido = form.fuente.startsWith("referido_")

  const canSubmit =
    !!form.nombre_completo.trim() &&
    !!form.numero_documento.trim() &&
    !!form.celular.trim() &&
    !!form.direccion.trim() &&
    mascotas.length > 0 &&
    !!mascotas[0].nombre.trim()

  const addMascota = () => setMascotas((prev) => [...prev, emptyMascota()])
  const removeMascota = (idx: number) =>
    setMascotas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  const updateMascota = (idx: number, patch: Partial<MascotaInput>) =>
    setMascotas((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSaving(true)

    const p_cliente = {
      codigo_cliente: generateCodigoCliente(),
      nombre_completo: form.nombre_completo.trim(),
      tipo_documento: form.tipo_documento,
      numero_documento: form.numero_documento.trim(),
      celular: form.celular.trim(),
      correo: form.correo.trim(),
      direccion: form.direccion.trim(),
      complemento_direccion: form.complemento_direccion.trim(),
      zona_id: form.zona_id,
      fuente: form.fuente,
      fuente_subtipo: isReferido ? form.fuente_subtipo.trim() : "",
      tipo_cliente: form.tipo_cliente,
    }

    const p_mascotas = mascotas
      .filter((m) => m.nombre.trim() !== "")
      .map((m) => ({
        nombre: m.nombre.trim(),
        raza: m.raza.trim(),
        peso_kg: m.peso_kg.trim(),
        edad_meses: m.edad_meses.trim(),
        necesidad_dolor: m.necesidad_dolor.trim(),
      }))

    const { data, error } = await supabase.rpc("create_cliente_con_mascotas", {
      p_cliente,
      p_mascotas,
    })

    setIsSaving(false)

    if (error) {
      // 23505 unique_violation — codigo_cliente or numero_documento collision
      if (error.code === "23505") {
        if (error.message.includes("numero_documento")) {
          toast.error("Ya existe un cliente con ese número de documento.")
        } else {
          toast.error("Conflicto al generar el código de cliente. Intenta de nuevo.")
        }
      } else {
        toast.error(`No se pudo crear el cliente: ${error.message}`)
      }
      return
    }

    const result = data as unknown as ClienteFormResult
    toast.success(
      `Cliente ${result.cliente.nombre_completo} creado con ${result.mascotas.length} mascota${result.mascotas.length === 1 ? "" : "s"}.`
    )
    onCreated(result)
  }

  return (
    <div className="space-y-6">
      {/* CLIENTE SECTION */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4 text-primary" />
          Datos del cliente
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cf-nombre">Nombre Completo *</Label>
            <Input
              id="cf-nombre"
              placeholder="Juan Pérez"
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo Documento</Label>
            <Select
              value={form.tipo_documento}
              onValueChange={(v: string | null) =>
                setForm({ ...form, tipo_documento: (v ?? "CC") as TipoDocumento })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CC">C.C.</SelectItem>
                <SelectItem value="CE">C.E.</SelectItem>
                <SelectItem value="NIT">NIT</SelectItem>
                <SelectItem value="Pasaporte">Pasaporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cf-doc">Número de Documento *</Label>
            <Input
              id="cf-doc"
              placeholder="1234567890"
              value={form.numero_documento}
              onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf-celular">Celular *</Label>
            <Input
              id="cf-celular"
              placeholder="3001234567"
              value={form.celular}
              onChange={(e) => setForm({ ...form, celular: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cf-correo">Correo Electrónico</Label>
          <Input
            id="cf-correo"
            type="email"
            placeholder="juan@email.com (opcional)"
            value={form.correo}
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cf-direccion">Dirección *</Label>
            <Input
              id="cf-direccion"
              placeholder="Cra 15 #100-20"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf-complemento">Complemento</Label>
            <Input
              id="cf-complemento"
              placeholder="Torre 3, Apto 501"
              value={form.complemento_direccion}
              onChange={(e) =>
                setForm({ ...form, complemento_direccion: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Zona de Envío</Label>
            <Select
              value={form.zona_id}
              onValueChange={(v: string | null) =>
                setForm({ ...form, zona_id: v ?? "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona..." />
              </SelectTrigger>
              <SelectContent>
                {zonas.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fuente</Label>
            <Select
              value={form.fuente}
              onValueChange={(v: string | null) =>
                setForm({
                  ...form,
                  fuente: (v ?? "otro") as FuenteCliente,
                  fuente_subtipo: "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meta_ads">Meta Ads</SelectItem>
                <SelectItem value="referido_cliente">Referido — Cliente</SelectItem>
                <SelectItem value="referido_veterinario">Referido — Veterinario</SelectItem>
                <SelectItem value="referido_entrenador">Referido — Entrenador</SelectItem>
                <SelectItem value="distribuidor">Distribuidor</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isReferido && (
          <div className="space-y-2">
            <Label htmlFor="cf-subtipo">Nombre del referente</Label>
            <Input
              id="cf-subtipo"
              placeholder="Quién refirió al cliente"
              value={form.fuente_subtipo}
              onChange={(e) => setForm({ ...form, fuente_subtipo: e.target.value })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Tipo de Cliente</Label>
          <Select
            value={form.tipo_cliente}
            onValueChange={(v: string | null) =>
              setForm({ ...form, tipo_cliente: (v ?? "publico") as TipoCliente })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publico">Público (consumidor final)</SelectItem>
              <SelectItem value="distribuidor">Distribuidor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* MASCOTAS SECTION */}
      <section className="space-y-3 border-t pt-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PawPrint className="h-4 w-4 text-primary" />
            Mascotas (mínimo 1)
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={addMascota}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar mascota
          </Button>
        </div>

        <div className="space-y-3">
          {mascotas.map((m, idx) => (
            <div
              key={idx}
              className="rounded-lg border bg-muted/30 p-3 space-y-3 relative"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Mascota {idx + 1}
                </p>
                {mascotas.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMascota(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`mascota-${idx}-nombre`} className="text-xs">
                    Nombre {idx === 0 && "*"}
                  </Label>
                  <Input
                    id={`mascota-${idx}-nombre`}
                    placeholder="Firulais"
                    value={m.nombre}
                    onChange={(e) => updateMascota(idx, { nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`mascota-${idx}-raza`} className="text-xs">Raza</Label>
                  <Input
                    id={`mascota-${idx}-raza`}
                    placeholder="Mestizo"
                    value={m.raza}
                    onChange={(e) => updateMascota(idx, { raza: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`mascota-${idx}-peso`} className="text-xs">Peso (kg)</Label>
                  <Input
                    id={`mascota-${idx}-peso`}
                    type="number"
                    step="0.1"
                    placeholder="12.5"
                    value={m.peso_kg}
                    onChange={(e) => updateMascota(idx, { peso_kg: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`mascota-${idx}-edad`} className="text-xs">Edad (meses)</Label>
                  <Input
                    id={`mascota-${idx}-edad`}
                    type="number"
                    placeholder="24"
                    value={m.edad_meses}
                    onChange={(e) => updateMascota(idx, { edad_meses: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`mascota-${idx}-dolor`} className="text-xs">
                  Necesidad / dolor (notas)
                </Label>
                <Textarea
                  id={`mascota-${idx}-dolor`}
                  rows={2}
                  placeholder="Alergias, condiciones, preferencias..."
                  value={m.necesidad_dolor}
                  onChange={(e) =>
                    updateMascota(idx, { necesidad_dolor: e.target.value })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isSaving}>
          {isSaving ? "Guardando..." : "Registrar Cliente"}
        </Button>
      </div>
    </div>
  )
}
