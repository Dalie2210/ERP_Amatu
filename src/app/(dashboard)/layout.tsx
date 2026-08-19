"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/useAuth"
import { useConteoNotifications } from "@/hooks/useConteoNotifications"
import { useDonacionNotifications } from "@/hooks/useDonacionNotifications"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Bell, HeartHandshake } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, role } = useAuth()
  const router = useRouter()
  const { pendientes } = useConteoNotifications(role === "admin")
  const { pendientes: donacionesPendientes } = useDonacionNotifications(role === "admin")

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background">Cargando...</div>
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-white px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="text-sm font-medium text-muted-foreground">
              Amatu ERP
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {role === "admin" && (
              <>
                <Link href="/inventario/conteo?tab=aprobaciones" title="Conteos pendientes">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {pendientes > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                        {pendientes}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link href="/admin/donaciones?tab=pendientes" title="Donaciones pendientes">
                  <Button variant="ghost" size="icon" className="relative">
                    <HeartHandshake className="h-5 w-5" />
                    {donacionesPendientes > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                        {donacionesPendientes}
                      </span>
                    )}
                  </Button>
                </Link>
              </>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{role || 'Usuario'}</p>
            </div>
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src="" alt="User" />
              <AvatarFallback className="bg-primary/10 text-primary">{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="p-6 md:p-8 flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
