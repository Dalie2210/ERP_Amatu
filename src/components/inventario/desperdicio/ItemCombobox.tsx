"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ItemOption } from "./utils"

interface Props {
  value: ItemOption | null
  options: ItemOption[]
  onChange: (item: ItemOption) => void
}

/**
 * Reemplazo del desplegable manual de la columna "PRODUCTO" del Excel: la
 * lista sale del catálogo real (insumos + presentaciones de PT), así que ya no
 * hay que mantener a mano las opciones ni se pueden escribir nombres que no
 * existen. Mismo patrón de combobox que `admin/ProductSelector`.
 */
export function ItemCombobox({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal h-9"
          />
        }
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value ? value.nombre : "Seleccionar…"}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar insumo o producto..." />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.key}
                  value={`${o.nombre} ${o.codigo ?? ""} ${o.detalle}`}
                  onSelect={() => { onChange(o); setOpen(false) }}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value?.key === o.key ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{o.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.codigo && <span className="font-mono mr-2">{o.codigo}</span>}
                      {o.detalle}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
