"use client"

import {
  Home, Package, Users, Truck, DollarSign, LogOut, Leaf, ShoppingBag,
  Handshake, Shield, Bike,
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import type { UserRole } from "@/types"

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  roles: UserRole[]
}

const mainItems: NavItem[] = [
  { title: "Inicio",     url: "/dashboard",        icon: Home,       roles: ["admin", "vendedor", "logistica", "contable"] },
  { title: "Ventas",     url: "/ventas",            icon: ShoppingBag, roles: ["admin", "vendedor"] },
  { title: "Pedidos",    url: "/pedidos",           icon: Package,    roles: ["admin", "vendedor", "logistica"] },
  { title: "Catálogo",   url: "/catalogo",          icon: Leaf,       roles: ["admin", "vendedor"] },
  { title: "Logística",  url: "/logistica",         icon: Truck,      roles: ["admin", "logistica"] },
  { title: "Mensajeros", url: "/logistica/mensajeros", icon: Bike,    roles: ["admin", "logistica"] },
  { title: "Liq. Mensajero", url: "/logistica/liquidacion-mensajero", icon: DollarSign, roles: ["admin", "logistica"] },
  { title: "Comisiones", url: "/comisiones",        icon: DollarSign, roles: ["admin", "contable", "vendedor"] },
  { title: "Aliados",    url: "/comisiones/aliados", icon: Handshake, roles: ["admin", "contable"] },
  { title: "Clientes",   url: "/clientes",          icon: Users,      roles: ["admin", "vendedor"] },
]


export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, isLoading } = useAuth()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const visibleMain = isLoading
    ? mainItems
    : mainItems.filter((item) => role && item.roles.includes(role))

  const showAdmin = !isLoading && role === "admin"

  return (
    <Sidebar className="border-r-0 bg-white">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3 text-primary">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-heading tracking-tight text-foreground">
              AMATU
            </h2>
            <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground leading-none">
              ERP System
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-6 py-4">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-4 gap-1">
              {visibleMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={
                      item.url === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.url)
                    }
                    className="rounded-md px-4 py-3"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-6 py-4">
              Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="px-4 gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/admin" />}
                    isActive={pathname === "/admin"}
                    className="rounded-md px-4 py-3"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Panel Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="px-4 py-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
