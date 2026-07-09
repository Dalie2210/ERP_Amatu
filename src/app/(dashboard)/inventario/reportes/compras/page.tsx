import { redirect } from "next/navigation"

// Unified into the inventory dashboard tabs. Kept as a redirect so old links/bookmarks work.
export default function ReporteComprasRedirect() {
  redirect("/inventario?tab=compras")
}
