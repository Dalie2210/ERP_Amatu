"use client"

import {
  Home, Package, Users, Truck, DollarSign, LogOut, Leaf, ShoppingBag,
  Handshake, Shield, Bike, Boxes, ClipboardList, FlaskConical,
  ArrowDownToLine, Warehouse, Settings2, Calculator,
  PlusCircle, ListOrdered, Route, Wallet,
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
  exact?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// Menú agrupado por dominio (antes era una lista plana de 10 ítems que mezclaba
// módulos con sub-features). Cada grupo se oculta si el rol no ve ningún ítem.
const navGroups: NavGroup[] = [
  {
    label: "General",
    items: [
      { title: "Inicio", url: "/dashboard", icon: Home, roles: ["admin", "vendedor", "logistica", "contable", "jefe_produccion"], exact: true },
    ],
  },
  {
    label: "Comercial",
    items: [
      { title: "Nueva Venta", url: "/ventas/nueva",     icon: PlusCircle,  roles: ["admin", "vendedor"] },
      { title: "Ventas",      url: "/ventas",           icon: ShoppingBag, roles: ["admin", "vendedor"], exact: true },
      { title: "Pedidos",     url: "/pedidos",          icon: ListOrdered, roles: ["admin", "vendedor", "logistica"] },
      { title: "Catálogo",    url: "/catalogo",         icon: Leaf,        roles: ["admin", "vendedor"] },
      { title: "Clientes",    url: "/clientes",         icon: Users,       roles: ["admin", "vendedor"] },
      { title: "Comisiones",  url: "/comisiones",       icon: DollarSign,  roles: ["admin", "contable", "vendedor"], exact: true },
      { title: "Aliados",     url: "/comisiones/aliados", icon: Handshake, roles: ["admin", "contable"] },
    ],
  },
  {
    label: "Logística",
    items: [
      { title: "Tablero",        url: "/logistica",                       icon: Truck,  roles: ["admin", "logistica"], exact: true },
      { title: "Rutas",          url: "/logistica/rutas",                 icon: Route,  roles: ["admin", "logistica"] },
      { title: "Mensajeros",     url: "/logistica/mensajeros",            icon: Bike,   roles: ["admin", "logistica"] },
      { title: "Liq. Mensajero", url: "/logistica/liquidacion-mensajero", icon: Wallet, roles: ["admin", "logistica"] },
    ],
  },
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

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: isLoading
        ? group.items
        : group.items.filter((item) => role && item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)

  const isItemActive = (item: NavItem) =>
    item.exact ? pathname === item.url : pathname.startsWith(item.url)

  const showAdmin = !isLoading && role === "admin"
  const showInventario = !isLoading && (role === "admin" || role === "logistica" || role === "jefe_produccion")
  // El jefe de producción solo ve Producción (+ Recetas y PT/Stock en lectura).
  const inventarioRolesJefe = ["/inventario/produccion", "/inventario/recetas", "/inventario/productos"]

  return (
    <Sidebar className="border-r-0 bg-sidebar">
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
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-6 py-4">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="px-4 gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isItemActive(item)}
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
        ))}

        {showInventario && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-6 py-4">
              Inventario
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="px-4 gap-1">
                {[
                  // Orden según la cadena de ejecución del inventario:
                  // planificación → compra → stock de insumos → BOM → producción →
                  // stock de PT → despacho → conteo.
                  // Reportes, movimientos, balance y trazabilidad viven unificados en
                  // el Dashboard de Inventario (/inventario) mediante pestañas.
                  { title: "Dashboard Inv.", url: "/inventario",                    icon: Boxes },
                  { title: "Explosión MP",   url: "/inventario/explosion",          icon: Calculator },
                  { title: "Ingresos",       url: "/inventario/ingresos",           icon: ArrowDownToLine },
                  { title: "Insumos",        url: "/inventario/insumos",            icon: Warehouse },
                  { title: "Recetas (BOM)",  url: "/inventario/recetas",            icon: ClipboardList },
                  { title: "Producción",     url: "/inventario/produccion",         icon: FlaskConical },
                  { title: "PT / Stock",     url: "/inventario/productos",          icon: Package },
                  { title: "Remisiones",     url: "/inventario/remisiones",         icon: Truck },
                  { title: "Conteo",         url: "/inventario/conteo",             icon: Settings2 },
                ].filter((item) => role !== "jefe_produccion" || inventarioRolesJefe.includes(item.url))
                  .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={
                        item.url === "/inventario"
                          ? pathname === "/inventario"
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
        )}

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
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
