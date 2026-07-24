import { requireRole } from "@/lib/auth/requireRole"

export default async function InventarioLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin", "logistica", "jefe_produccion"])
  return <>{children}</>
}
