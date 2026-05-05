"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { Package, TrendingUp, Users, Truck } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()

  const stats = [
    {
      title: "Ventas del Día",
      value: "$1.240.000",
      description: "+15% respecto a ayer",
      icon: TrendingUp,
    },
    {
      title: "Pedidos Pendientes",
      value: "12",
      description: "4 por despachar hoy",
      icon: Package,
    },
    {
      title: "Envíos en Ruta",
      value: "8",
      description: "Zona Bogotá Norte",
      icon: Truck,
    },
    {
      title: "Nuevos Clientes",
      value: "+3",
      description: "En los últimos 7 días",
      icon: Users,
    },
  ]

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight">
          ¡Hola, {user?.email?.split('@')[0] || "Equipo"}! 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Aquí tienes un resumen de la operación de hoy.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Spacer for future content */}
      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <Card className="border-none shadow-sm min-h-[300px]">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Últimos Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center text-muted-foreground h-[200px]">
            El módulo de pedidos se conectará en el próximo sprint.
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm min-h-[300px]">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Rutas Activas</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center text-muted-foreground h-[200px]">
            El módulo de logística se conectará próximamente.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
