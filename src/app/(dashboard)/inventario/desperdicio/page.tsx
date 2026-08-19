"use client"

import { Suspense, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Trash2, History, BarChart2 } from "lucide-react"

const loading = () => <Skeleton className="h-64 w-full" />
const DesperdicioCapturaPanel = dynamic(() => import("@/components/inventario/desperdicio/DesperdicioCapturaPanel").then((m) => m.DesperdicioCapturaPanel), { loading })
const DesperdicioHistorialPanel = dynamic(() => import("@/components/inventario/desperdicio/DesperdicioHistorialPanel").then((m) => m.DesperdicioHistorialPanel), { loading })
const DesperdicioDashboardPanel = dynamic(() => import("@/components/inventario/desperdicio/DesperdicioDashboardPanel").then((m) => m.DesperdicioDashboardPanel), { loading })

const TABS = [
  { value: "registro", label: "Registro", icon: Trash2 },
  { value: "historial", label: "Histórico", icon: History },
  { value: "dashboard", label: "Dashboard", icon: BarChart2 },
] as const

const VALID = new Set<string>(TABS.map((t) => t.value))

function DesperdicioTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawTab = searchParams.get("tab") ?? "registro"
  const tab = VALID.has(rawTab) ? rawTab : "registro"

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`/inventario/desperdicio?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Reporte de desperdicio</h1>
        <p className="text-muted-foreground mt-1">
          Alimento que se perdió y por qué: fecha, producto, kilos, temperatura, proveedor y lote.
          Es un registro de trazabilidad — el stock lo corrige el conteo físico, no este reporte.
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

        <TabsContent value="registro" className="mt-6">
          {tab === "registro" && <DesperdicioCapturaPanel />}
        </TabsContent>
        <TabsContent value="historial" className="mt-6">
          {tab === "historial" && <DesperdicioHistorialPanel />}
        </TabsContent>
        <TabsContent value="dashboard" className="mt-6">
          {tab === "dashboard" && <DesperdicioDashboardPanel />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function DesperdicioPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-[1440px] mx-auto" />}>
      <DesperdicioTabs />
    </Suspense>
  )
}
