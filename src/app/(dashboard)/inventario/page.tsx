"use client"

import { Suspense, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Boxes, ArrowLeftRight, Scale, ScanBarcode, ShoppingCart } from "lucide-react"

// Deferred so Recharts and each tab's data fetching only load when the tab is opened.
const loading = () => <Skeleton className="h-64 w-full" />
const VistaGeneralPanel = dynamic(() => import("@/components/inventario/dashboard/VistaGeneralPanel").then((m) => m.VistaGeneralPanel), { loading })
const MovimientosPanel = dynamic(() => import("@/components/inventario/dashboard/MovimientosPanel").then((m) => m.MovimientosPanel), { loading })
const BalancePanel = dynamic(() => import("@/components/inventario/dashboard/BalancePanel").then((m) => m.BalancePanel), { loading })
const TrazabilidadPanel = dynamic(() => import("@/components/inventario/dashboard/TrazabilidadPanel").then((m) => m.TrazabilidadPanel), { loading })
const ComprasPanel = dynamic(() => import("@/components/inventario/dashboard/ComprasPanel").then((m) => m.ComprasPanel), { loading })

const TABS = [
  { value: "general", label: "Vista General", icon: Boxes },
  { value: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { value: "balance", label: "Balance", icon: Scale },
  { value: "trazabilidad", label: "Trazabilidad", icon: ScanBarcode },
  { value: "compras", label: "Compras", icon: ShoppingCart },
] as const

const VALID = new Set<string>(TABS.map((t) => t.value))

function InventarioDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get("tab") ?? "general"
  const tab = VALID.has(rawTab) ? rawTab : "general"
  const comprasSub = searchParams.get("sub") === "anual" ? "anual" : "periodo"

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    params.delete("sub")
    router.replace(`/inventario?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Inventario</h1>
        <p className="text-muted-foreground mt-1">
          Reportes, movimientos, balance y trazabilidad del inventario en un solo lugar.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="h-4 w-4" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="mt-6">
          {tab === "general" && <VistaGeneralPanel />}
        </TabsContent>
        <TabsContent value="movimientos" className="mt-6">
          {tab === "movimientos" && <MovimientosPanel />}
        </TabsContent>
        <TabsContent value="balance" className="mt-6">
          {tab === "balance" && <BalancePanel />}
        </TabsContent>
        <TabsContent value="trazabilidad" className="mt-6">
          {tab === "trazabilidad" && <TrazabilidadPanel />}
        </TabsContent>
        <TabsContent value="compras" className="mt-6">
          {tab === "compras" && <ComprasPanel initialSub={comprasSub} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function InventarioPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-[1440px] mx-auto" />}>
      <InventarioDashboard />
    </Suspense>
  )
}
