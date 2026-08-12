"use client"

import { use } from "react"
import { IngresoForm } from "@/components/inventario/IngresoForm"

export default function EditarIngresoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <IngresoForm mode="editar" ingresoId={id} />
}
