"use client"

import { useState, useEffect } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DeleteConfirmDialogProps {
  trigger: React.ReactNode
  entityLabel: string
  confirmToken: string
  description?: string
  onConfirm: () => Promise<void>
}

export function DeleteConfirmDialog({
  trigger,
  entityLabel,
  confirmToken,
  description,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!open) setInput("")
  }, [open])

  const handleConfirm = async () => {
    if (input !== confirmToken) return
    setIsDeleting(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Eliminar {entityLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            {description ?? "Esta acción es irreversible y eliminará todos los datos asociados."}
          </p>

          <div className="space-y-2">
            <Label className="text-sm">
              Para confirmar, escribe el identificador:
            </Label>
            <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm tracking-wide select-all border">
              {confirmToken}
            </div>
            <Input
              placeholder={confirmToken}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm() }}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={input !== confirmToken || isDeleting}
          >
            {isDeleting ? "Eliminando..." : "Eliminar definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
