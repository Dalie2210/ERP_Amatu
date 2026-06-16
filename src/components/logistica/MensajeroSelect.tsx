"use client"

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface MensajeroOption {
  id: string
  nombre: string
  telefono: string
}

interface Props {
  supabase: SupabaseClient
  value: string | null
  onChange: (mensajero: MensajeroOption | null) => void
  disabled?: boolean
  placeholder?: string
}

export function MensajeroSelect({
  supabase,
  value,
  onChange,
  disabled,
  placeholder = "Seleccionar mensajero...",
}: Props) {
  const [mensajeros, setMensajeros] = useState<MensajeroOption[]>([])

  useEffect(() => {
    const fetchMensajeros = async () => {
      const { data } = await supabase
        .from("mensajeros")
        .select("id, nombre, telefono")
        .eq("is_active", true)
        .order("nombre")
      if (data) setMensajeros(data as MensajeroOption[])
    }
    fetchMensajeros()
  }, [supabase])

  return (
    <Select
      value={value ?? ""}
      disabled={disabled}
      onValueChange={(v: string | null) =>
        onChange(mensajeros.find((m) => m.id === v) ?? null)
      }
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {value ? (mensajeros.find((m) => m.id === value)?.nombre ?? null) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {mensajeros.length === 0 ? (
          <SelectItem value="__none__" disabled>
            No hay mensajeros registrados
          </SelectItem>
        ) : (
          mensajeros.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.nombre}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
