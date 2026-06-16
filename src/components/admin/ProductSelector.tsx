"use client"

import { useMemo, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductoOption {
  id: string
  nombre: string
  sku: string | null
  variantes: VarianteOption[]
}

interface VarianteOption {
  id: string
  presentacion: string
  sku: string
}

interface ProductSelectorProps {
  productoId: string | null
  varianteId: string | null
  onProductoChange: (productoId: string | null) => void
  onVarianteChange: (varianteId: string | null) => void
  placeholder?: string
  showVariante?: boolean
}

export function ProductSelector({
  productoId,
  varianteId,
  onProductoChange,
  onVarianteChange,
  placeholder = "Seleccionar producto...",
  showVariante = true,
}: ProductSelectorProps) {
  const supabase = useMemo(() => createClient(), [])
  const [productos, setProductos] = useState<ProductoOption[]>([])
  const [openProducto, setOpenProducto] = useState(false)
  const [openVariante, setOpenVariante] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("productos")
        .select(`id, nombre, sku, producto_variantes(id, presentacion, sku)`)
        .eq("is_active", true)
        .order("nombre")
      if (data) {
        setProductos(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            sku: p.sku,
            variantes: p.producto_variantes ?? [],
          }))
        )
      }
    }
    load()
  }, [supabase])

  const selectedProducto = productos.find((p) => p.id === productoId)
  const selectedVariante = selectedProducto?.variantes.find((v) => v.id === varianteId)
  const variantesDisponibles = selectedProducto?.variantes ?? []

  function handleProductoSelect(id: string) {
    onProductoChange(id)
    onVarianteChange(null)
    setOpenProducto(false)
  }

  return (
    <div className="flex gap-2">
      {/* Producto picker */}
      <Popover open={openProducto} onOpenChange={setOpenProducto}>
        <PopoverTrigger>
          <Button
            variant="outline"
            role="combobox"
            className="flex-1 justify-between font-normal"
          >
            <span className="truncate">
              {selectedProducto ? selectedProducto.nombre : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar producto..." />
            <CommandList>
              <CommandEmpty>Sin resultados</CommandEmpty>
              <CommandGroup>
                {productos.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.nombre}
                    onSelect={() => handleProductoSelect(p.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        productoId === p.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <p className="text-sm">{p.nombre}</p>
                      {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Variante picker (optional) */}
      {showVariante && variantesDisponibles.length > 0 && (
        <Popover open={openVariante} onOpenChange={setOpenVariante}>
          <PopoverTrigger>
            <Button
              variant="outline"
              role="combobox"
              className="w-36 justify-between font-normal"
            >
              <span className="truncate">
                {selectedVariante ? selectedVariante.presentacion : "Variante (opc.)"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    value="__none__"
                    onSelect={() => { onVarianteChange(null); setOpenVariante(false) }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", !varianteId ? "opacity-100" : "opacity-0")}
                    />
                    Cualquier variante
                  </CommandItem>
                  {variantesDisponibles.map((v) => (
                    <CommandItem
                      key={v.id}
                      value={v.presentacion}
                      onSelect={() => { onVarianteChange(v.id); setOpenVariante(false) }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          varianteId === v.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {v.presentacion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
