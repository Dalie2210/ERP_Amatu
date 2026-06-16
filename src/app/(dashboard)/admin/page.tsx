"use client"

import Link from "next/link"
import { Users, Percent, Handshake, Settings2, Scale, Gift } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const adminModules = [
  {
    title: "Usuarios",
    description: "Crear y gestionar cuentas de vendedores, logística y contables.",
    href: "/admin/usuarios",
    icon: Users,
  },
  {
    title: "Config Comisiones",
    description: "Editar rangos de cierre y porcentajes de comisión por tramo de venta.",
    href: "/admin/comisiones-config",
    icon: Settings2,
  },
  {
    title: "Reglas de Descuento",
    description: "Editar montos mínimos y porcentajes de descuento por escala de pedido.",
    href: "/admin/descuentos",
    icon: Percent,
  },
  {
    title: "Aliados",
    description: "Crear y gestionar veterinarios y entrenadores aliados.",
    href: "/admin/aliados",
    icon: Handshake,
  },
  {
    title: "Pesos Magistrales",
    description: "Configurar los gramajes disponibles para variantes de dietas magistrales.",
    href: "/admin/pesos-magistrales",
    icon: Scale,
  },
  {
    title: "Promociones & Kits",
    description: "Configurar promociones automáticas (paga X lleva más, producto gratis) y kits de productos preconfigurados.",
    href: "/admin/promociones-kits",
    icon: Gift,
  },
]

export default function AdminPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Administración</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configuración general del sistema.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminModules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <mod.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base font-heading">{mod.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{mod.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
