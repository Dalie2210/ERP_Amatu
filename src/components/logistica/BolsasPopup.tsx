"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";

interface BolsasPopupProps {
  open: boolean;
  pedidoNumero?: string;
  defaultValue?: number;
  onConfirm: (bolsas: number) => Promise<void> | void;
  onCancel: () => void;
}

export function BolsasPopup({
  open,
  pedidoNumero,
  defaultValue = 1,
  onConfirm,
  onCancel,
}: BolsasPopupProps) {
  const [bolsas, setBolsas] = useState<number | "">(defaultValue > 0 ? defaultValue : "");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBolsas(defaultValue > 0 ? defaultValue : "");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open, defaultValue]);

  const isValid = typeof bolsas === "number" && bolsas >= 1;

  async function handleConfirm() {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm(bolsas as number);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            Bolsas para despacho
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {pedidoNumero && (
            <p className="text-sm text-muted-foreground">
              Pedido <span className="font-medium text-foreground">{pedidoNumero}</span> pasará a{" "}
              <span className="font-medium text-indigo-700">Listo para Despacho</span>.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="bolsas-input" className="text-sm font-medium">
              ¿Cuántas bolsas tiene este pedido?
            </Label>
            <Input
              ref={inputRef}
              id="bolsas-input"
              type="number"
              min={1}
              value={bolsas}
              onChange={(e) => setBolsas(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 0))}
              className={`${!isValid && bolsas !== "" ? "border-red-500" : ""}`}
              onKeyDown={(e) => { if (e.key === "Enter" && isValid) handleConfirm(); }}
              placeholder="Ingresa el número de bolsas"
              autoFocus
            />
            {bolsas === "" && (
              <p className="text-xs text-red-600 font-medium">El número de bolsas es requerido</p>
            )}
            {typeof bolsas === "number" && bolsas < 1 && (
              <p className="text-xs text-red-600 font-medium">Debe haber mínimo 1 bolsa</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !isValid}>
            {loading ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
