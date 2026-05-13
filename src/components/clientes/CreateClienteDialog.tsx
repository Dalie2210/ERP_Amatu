"use client"

import { useState, type ReactNode, type ReactElement } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger as ReactElement} /> : null}
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Registrar Cliente</DialogTitle>
          <DialogDescription>
            Ingresa los datos del cliente y al menos una mascota. Todo se guarda
            en una sola operación.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-2 -mr-2">
          <ClienteForm
            defaultNombre={defaultNombre}
            defaultZonaId={defaultZonaId}
            onCreated={handleCreated}
            onCancel={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
