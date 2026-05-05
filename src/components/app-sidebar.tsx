"use client"

import { Home, Package, Users, Truck, DollarSign, Settings, LogOut, Leaf } from "lucide-react"
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

const items = [
  {
    title: "Inicio",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Pedidos",
    url: "/pedidos",
    icon: Package,
  },
  {
    title: "Catálogo",
    url: "/catalogo",
    icon: Leaf,
  },
  {
    title: "Logística",
    url: "/logistica",
    icon: Truck,
  },
  {
    title: "Comisiones",
    url: "/comisiones",
    icon: DollarSign,
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

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
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url}
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
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="px-4 py-3 text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5 mr-3" />
              <span>Configuración</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
