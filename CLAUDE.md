# Amatu ERP — AI Development Guidance

> **Last Updated:** 2026-05-12 | **Status:** Phase 1, Sprint 7 (90% complete)

---

## 1. Project Overview

Amatu ERP is a **B2B SaaS platform** for premium pet nutrition sales, commission tracking, and logistics. Stack: **Next.js 16 (App Router)** · **TypeScript** · **React 19** · **Tailwind CSS** · **shadcn/ui** · **Supabase (PostgreSQL + Auth)** · **Zustand** · **n8n** · **Kommo CRM API**.

**Business Model:** Direct sales (Meta Ads, referrals) + distributor partnerships. Vendors earn tiered commissions based on close rate (for Meta Ads) or customer history. Logistics routed through external couriers via n8n webhook.

---

## 2. Sprint Status & Completion

| Sprint | Title | Status | Notes |
|--------|-------|--------|-------|
| Sprint 0 | Setup | ✅ Done | Project bootstrapped, deps installed |
| Sprint 1 | DB + Auth | ✅ Done | All 20 tables, RLS, seed data, triggers created |
| Sprint 2 | Auth UI + Layout | ✅ Done | Login, middleware, sidebar, layout working |
| Sprint 3 | Catalog | ✅ Done | Product CRUD + variants + scale pricing |
| Sprint 4 | Clients | ✅ Done | Client list, detail, pet management |
| Sprint 5 | Ventas (Orders) | ✅ 98% | Cart, submission, editing, audit trail done. OrderEditDialog TS errors fixed |
| Sprint 6 | Commissions | ⚠️ 85% | Dashboard, leads form, liquidation done. **Missing:** aliados commissions UI |
| Sprint 7 | Logistics | ✅ 90% | Kanban, route builder, dispatch, print labels done. **Missing:** Kommo stage update on dispatch |
| Sprint 8 | n8n + Kommo | ⚠️ 35% | `/api/despachar-ruta` done (n8n webhook call). **Missing:** Kommo API call |
| Sprint 9 | Admin + Polish | 🔴 0% | Not started: user CRUD, config CRUDs, live stats |

---

## 3. Critical Patterns & Conventions

### 3.1 Database Client (Supabase)
```typescript
// ALWAYS use the client factory; never instantiate directly
import { createClient } from "@/lib/supabase/client"
const supabase = useMemo(() => createClient(), [])

// For RLS: auth.getUser() returns the authenticated vendor
const { data: { user } } = await supabase.auth.getUser()
```

### 3.2 State Management (Zustand)
- **Cart store:** `useCartStore()` — client state for current order (items, client_id, metodoPago, etc.)
- **All setters accept union types:** `setFuente(fuente, fuenteSubtipo?)` — do NOT call separate setter methods
- **Getters must be function calls:** `getSubtotalAlimento()` not `.subtotalAlimento`

### 3.3 UI Patterns
- **Dialogs:** Use `DialogTrigger` with composition, NOT render props (consistency across clientes/catalogo)
- **Buttons:** Standard sizes only: `"default"`, `"sm"`, `"lg"`, `"icon"` (NOT `"icon-sm"`)
- **Toast notifications:** Import from `sonner` and use globally (Toaster mounted in root layout)

### 3.4 Commission Calculations
- **Entry point:** `src/lib/calculators/commissions.ts::calcularComision()`
- **Rules:** Distributor=0%, venta#7+=0%, referido sources = venta#2+ tier, venta#1 non-referido=0%
- **Meta Ads close rate:** Query `leads_meta_ads` (leads) vs `pedidos` filtered by fuente + venta#1 (closures)
- **Always populate `comisiones_detalle`** on order creation (happens in `OrderSummaryCard` after pedido insert)

### 3.5 Order Creation Flow
- **Location:** `src/components/ventas/OrderSummaryCard.tsx::handleSave()`
- **Process:** Insert `pedidos` → Insert `detalle_pedido` → Calculate commission → Insert `comisiones_detalle`
- **Triggers:** DB triggers auto-calculate `numero_pedido` (year+seq) and `numero_venta_cliente` (count of prior confirmed orders for client)

---

## 4. Known Limitations & Workarounds

### 4.1 Next.js 16 Breaking Changes
- `next/navigation` exports changed; useRouter, useSearchParams no longer in next/router
- `next/font` is the only supported font loader; Google Fonts required via `@next/font`
- App Router layout.tsx is mandatory; no page.tsx in root (all routes under src/app/)

### 4.2 Database & RLS
- **`fn_get_user_role(user_id)`** is `SECURITY INVOKER` (not DEFINER) — safe for authenticated calls
- **RLS policies enforce vendor isolation:** Vendors see only their own orders, clients, commissions
- **Admin access:** Role='admin' in `users.role` — no RLS row-level filtering for admins (trusted system)

### 4.3 Active Bugs (Fixed in Session 1)
- ✅ `numero_pedido` now auto-generated via trigger (was client-side Math.random())
- ✅ `numero_venta_cliente` now calculated via trigger (was hardcoded 1, breaking commissions)
- ✅ Toast notifications now work (Toaster mounted in root layout)
- ✅ `fuente_subtipo` UI added to OrderOptionsPanel (conditional on referido_* selection)
- ✅ `comisiones_detalle` now populated on order creation

---

## 5. File Architecture

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          [AUTH guard + sidebar]
│   │   ├── dashboard/          [STATS dashboard]
│   │   ├── catalogo/           [PRODUCT catalog + variants]
│   │   ├── clientes/           [CLIENT list + detail + pets]
│   │   ├── ventas/             [ORDER list + detail + edit (TODO)]
│   │   ├── comisiones/         [COMMISSION tracking (TODO)]
│   │   ├── logistica/          [KANBAN + routes (TODO)]
│   │   └── admin/              [USER & CONFIG CRUDs (TODO)]
│   ├── login/                  [AUTH entry point]
│   ├── layout.tsx              [ROOT layout + Toaster]
│   └── globals.css             [Tailwind theme tokens]
├── components/
│   ├── ventas/                 [ORDER components]
│   │   ├── OrderSummaryCard    [SUBMIT logic + commission]
│   │   └── OrderOptionsPanel   [FORM fields]
│   ├── app-sidebar.tsx         [NAVIGATION]
│   └── ui/                     [shadcn components]
├── lib/
│   ├── supabase/               [Client factory + auth helpers]
│   ├── calculators/            [DISCOUNT + COMMISSION + MAGISTRAL logic]
│   └── pedidos/                [EMPTY: order business logic will go here]
├── hooks/
│   ├── useAuth.ts              [AUTH context]
│   └── useDebounce.ts          [SEARCH debounce]
├── stores/
│   └── cartStore.ts            [ZUSTAND order state]
└── types/
    └── index.ts                [ALL TypeScript types from Supabase]
```

---

## 6. Developer Workflow

### Before Writing Code
1. Read `AGENTS.md` (Next.js 16 breaking changes)
2. Check `implementation_plan.md` for sprint scope and database schema
3. Review relevant type definitions in `src/types/index.ts`
4. Check memory system (`C:\Users\danie\.claude\projects\...\memory\`) for recent decisions

### When Modifying UI
- Test in browser (dev server running)
- Check responsive design (mobile, tablet, desktop)
- Verify toast notifications fire correctly
- Check RLS policies if adding new data access patterns

### When Touching Database
- Use Supabase MCP tools (apply_migration, execute_sql, get_advisors)
- Always run `get_advisors` after schema changes (security + performance)
- Keep `implementation_plan.md::Modelo Entidad-Relación` in sync
- Test RLS policies with different user roles

---

## 7. Links & References

- **Sprint Roadmap:** See `implementation_plan.md` (full MER, detailed requirements per sprint)
- **Design System:** See `docs/DESIGN.md` (color palette, typography, component styling)
- **Session History:** See `docs/archive/` (archived session notes)
- **Memory System:** `C:\Users\danie\.claude\projects\c--Users-danie-OneDrive-Desktop-Amatu-ERP\memory\`
  - `project_erp_status.md` — current sprint %, blockers
  - `project_critical_bugs.md` — prioritized bug list (updated 2026-05-12)
  - `project_code_patterns.md` — established conventions

---

## 8. Quick Reference: Next Steps

**Session 5 (Upcoming):**
1. Sprint 6 missing: aliados commissions UI (`/comisiones/aliados/page.tsx`)
2. Sprint 8: Kommo CRM API call in `/api/despachar-ruta/route.ts` (update contact stage on dispatch)
3. Sprint 9: Admin module — user management, discount config, catalog config

**Sprint 7 — What was built in Session 4:**
- Fixed `OrderEditDialog.tsx` — 4 TS errors (Base UI render prop + Select null-guard)
- `src/app/(dashboard)/logistica/page.tsx` — Kanban board (4 columns)
- `src/components/logistica/UpdateEstadoDialog.tsx` — state transition dialog
- `src/app/(dashboard)/logistica/rutas/page.tsx` — route list + create route
- `src/components/logistica/CreateRutaDialog.tsx` — route creation dialog
- `src/app/(dashboard)/logistica/rutas/[id]/page.tsx` — route detail: assign orders, bolsas, delivery order, dispatch
- `src/lib/logistica/despacharRuta.ts` — dispatch service (payload builder + DB update)
- `src/app/api/despachar-ruta/route.ts` — POST API → n8n webhook → mark despachado
- `src/app/(dashboard)/logistica/rutas/[id]/etiquetas/page.tsx` — print labels (browser print, no extra deps)

**Key logistics patterns:**
- Dispatch flow: listo_despacho → assigned to ruta → "Despachar Ruta" → POST /api/despachar-ruta → n8n + DB
- Print labels: open `/logistica/rutas/[id]/etiquetas` in new tab → browser print
- n8n webhook: configure `N8N_WEBHOOK_URL` in .env.local (already present, empty)

---

**This file is the single source of truth for AI development context. Read it once per session.**
