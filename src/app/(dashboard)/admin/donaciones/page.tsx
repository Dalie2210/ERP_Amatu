"use client"

import { Suspense, useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, History, BarChart2 } from "lucide-react"

const loading = () => <Skeleton className="h-64 w-full" />
const AprobacionesDonacionPanel = dynamic(() => import("@/components/admin/donaciones/AprobacionesDonacionPanel").then((m) => m.AprobacionesDonacionPanel), { loading })
const DonacionesHistorialPanel = dynamic(() => import("@/components/admin/donaciones/DonacionesHistorialPanel").then((m) => m.DonacionesHistorialPanel), { loading })
const DonacionesDashboardPanel = dynamic(() => import("@/components/admin/donaciones/DonacionesDashboardPanel").then((m) => m.DonacionesDashboardPanel), { loading })

const TABS = [
  { value: "pendientes", label: "Pendientes", icon: ShieldCheck },
  { value: "historico", label: "Histórico", icon: History },
  { value: "dashboard", label: "Dashboard", icon: BarChart2 },
] as const

const VALID = new Set<string>(TABS.map((t) => t.value))

function DonacionesTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pendientes, setPendientes] = useState(0)

  const rawTab = searchParams.get("tab") ?? "pendientes"
  const tab = VALID.has(rawTab) ? rawTab : "pendientes"

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`/admin/donaciones?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Donaciones</h1>
        <p className="text-muted-foreground mt-1">
          Producto entregado sin cobro, venga de una orden de venta o de un lote de stock. Nada sale
          de bodega hasta que se apruebe aquí.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.value === "pendientes" && pendientes > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">{pendientes}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="pendientes" className="mt-6">
          {tab === "pendientes" && <AprobacionesDonacionPanel onCountChange={setPendientes} />}
        </TabsContent>
        <TabsContent value="historico" className="mt-6">
          {tab === "historico" && <DonacionesHistorialPanel />}
        </TabsContent>
        <TabsContent value="dashboard" className="mt-6">
          {tab === "dashboard" && <DonacionesDashboardPanel />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function DonacionesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-[1440px] mx-auto" />}>
      <DonacionesTabs />
    </Suspense>
  )
}
