"use client"

import { Suspense, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardCheck, History } from "lucide-react"
import { DescargarConteoButton } from "@/components/inventario/DescargarConteoButton"

const loading = () => <Skeleton className="h-64 w-full" />
const ConteoCapturaPanel = dynamic(() => import("@/components/inventario/conteo/ConteoCapturaPanel").then((m) => m.ConteoCapturaPanel), { loading })
const ConteoHistorialPanel = dynamic(() => import("@/components/inventario/conteo/ConteoHistorialPanel").then((m) => m.ConteoHistorialPanel), { loading })

const TABS = [
  { value: "conteo", label: "Conteo", icon: ClipboardCheck },
  { value: "historial", label: "Histórico", icon: History },
] as const

const VALID = new Set<string>(TABS.map((t) => t.value))

function ConteoTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get("tab") ?? "conteo"
  const tab = VALID.has(rawTab) ? rawTab : "conteo"

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`/inventario/conteo?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Conteo</h1>
          <p className="text-muted-foreground mt-1">
            Captura el inventario físico en bloque: escribe las cantidades contadas, revisa las
            diferencias y guarda todos los ajustes de una sola vez.
          </p>
        </div>
        <DescargarConteoButton />
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

        <TabsContent value="conteo" className="mt-6">
          {tab === "conteo" && <ConteoCapturaPanel />}
        </TabsContent>
        <TabsContent value="historial" className="mt-6">
          {tab === "historial" && <ConteoHistorialPanel />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ConteoPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-[1440px] mx-auto" />}>
      <ConteoTabs />
    </Suspense>
  )
}
