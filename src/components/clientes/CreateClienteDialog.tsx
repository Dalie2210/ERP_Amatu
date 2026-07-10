"use client"

import { useState, type ReactNode, type ReactElement } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ClienteForm, type ClienteFormResult } from "./ClienteForm"

export interface CreateClienteDialogProps {
  trigger?: ReactNode
  defaultNombre?: string
  defaultZonaId?: string
  onCreated?: (result: ClienteFormResult) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateClienteDialog({
  trigger,
  defaultNombre,
  defaultZonaId,
  onCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateClienteDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setUncontrolledOpen

  const handleCreated = (result: ClienteFormResult) => {
    setOpen(false)
    onCreated?.(result)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? <SheetTrigger render={trigger as ReactElement} /> : null}
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar Cliente</SheetTitle>
          <SheetDescription>
            Ingresa los datos del cliente y al menos una mascota. Todo se guarda
            en una sola operación.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <ClienteForm
            defaultNombre={defaultNombre}
            defaultZonaId={defaultZonaId}
            onCreated={handleCreated}
            onCancel={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
