import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, CartState, FuenteCliente, FranjaHoraria, MetodoPago } from "@/types";

interface CartActions {
  addItem: (item: CartItem) => void;
  removeItem: (productoId: string, varianteId?: string) => void;
  updateQuantity: (productoId: string, cantidad: number, varianteId?: string) => void;
  setCliente: (clienteId: string | null) => void;
  setMascotas: (mascotaIds: string[]) => void;
  toggleMascota: (mascotaId: string) => void;
  setZona: (zonaId: string | null) => void;
  setFuente: (fuente: FuenteCliente | null, subtipo?: string | null) => void;
  setNotasVentas: (notas: string) => void;
  setFranjaHoraria: (franja: FranjaHoraria) => void;
  setMetodoPago: (metodo: MetodoPago | null) => void;
  setFechaTentativa: (fecha: string | null) => void;
  setClienteConfig: (esDistribuidor: boolean, pctDescuento: number, tarifaEnvio: number) => void;
  // B3: alternate delivery address
  setUsaDireccionAlterna: (usar: boolean) => void;
  setDireccionAlterna: (v: string) => void;
  setComplementoAlterna: (v: string) => void;
  setBarrioAlterna: (v: string) => void;
  setZonaAlternaId: (id: string | null) => void;
  // B5: aliado
  setAliadoId: (id: string | null) => void;
  // B6: referido vet discount
  setDescuentoReferidoVet: (pct: number) => void;
  // ERP-DON-01: donación (solo admin)
  setEsDonacion: (esDonacion: boolean) => void;
  setDonacionDestinatario: (v: string) => void;
  setDonacionMotivo: (v: string) => void;
  setItems: (items: CartItem[]) => void;
  togglePromoEnabled: (promoId: string) => void;
  clearCart: () => void;

  // Computed
  getSubtotalAlimento: () => number;
  getSubtotalSnacks: () => number;
  getSubtotalOtros: () => number;
  getSubtotal: () => number;
  getItemCount: () => number;
}

const initialState: CartState = {
  items: [],
  clienteId: null,
  mascotaIds: [],
  zonaId: null,
  fuente: null,
  fuenteSubtipo: null,
  notasVentas: "",
  franjaHoraria: "sin_franja",
  metodoPago: null,
  fechaTentativaEntrega: null,
  esDistribuidor: false,
  pctDescuentoDistribuidor: 0,
  tarifaEnvioBase: 0,
  usaDireccionAlterna: false,
  direccionAlterna: null,
  complementoAlterna: null,
  barrioAlterna: null,
  zonaAlternaId: null,
  aliadoId: null,
  descuentoReferidoVet: 0,
  disabledPromoIds: [],
  esDonacion: false,
  donacionDestinatario: "",
  donacionMotivo: "",
};

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
  ...initialState,

  addItem: (item) =>
    set((state) => {
      // Only match against real items (promo items are managed separately by syncPromos)
      const existing = state.items.find(
        (i) =>
          !i.esPromo &&
          i.productoId === item.productoId &&
          i.varianteId === item.varianteId
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            !i.esPromo &&
            i.productoId === item.productoId &&
            i.varianteId === item.varianteId
              ? {
                  ...i,
                  cantidad: i.cantidad + item.cantidad,
                  subtotal:
                    (i.cantidad + item.cantidad) * i.precioUnitario,
                }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (productoId, varianteId) =>
    set((state) => ({
      items: state.items.filter(
        (i) =>
          i.esPromo ||
          !(i.productoId === productoId && i.varianteId === varianteId)
      ),
    })),

  updateQuantity: (productoId, cantidad, varianteId) =>
    set((state) => ({
      items: state.items.map((i) =>
        !i.esPromo &&
        i.productoId === productoId &&
        i.varianteId === varianteId
          ? { ...i, cantidad, subtotal: cantidad * i.precioUnitario }
          : i
      ),
    })),

  setCliente: (clienteId) => set({ clienteId }),
  setMascotas: (mascotaIds) => set({ mascotaIds }),
  toggleMascota: (mascotaId) =>
    set((state) => ({
      mascotaIds: state.mascotaIds.includes(mascotaId)
        ? state.mascotaIds.filter((id) => id !== mascotaId)
        : [...state.mascotaIds, mascotaId],
    })),
  setZona: (zonaId) => set({ zonaId }),
  setFuente: (fuente, subtipo = null) => set({ fuente, fuenteSubtipo: subtipo }),
  setNotasVentas: (notasVentas) => set({ notasVentas }),
  setFranjaHoraria: (franjaHoraria) => set({ franjaHoraria }),
  setMetodoPago: (metodoPago) => set({ metodoPago }),
  setFechaTentativa: (fechaTentativaEntrega) => set({ fechaTentativaEntrega }),
  setClienteConfig: (esDistribuidor, pctDescuentoDistribuidor, tarifaEnvioBase) =>
    set({ esDistribuidor, pctDescuentoDistribuidor, tarifaEnvioBase }),
  setUsaDireccionAlterna: (usaDireccionAlterna) => set({ usaDireccionAlterna }),
  setDireccionAlterna: (direccionAlterna) => set({ direccionAlterna }),
  setComplementoAlterna: (complementoAlterna) => set({ complementoAlterna }),
  setBarrioAlterna: (barrioAlterna) => set({ barrioAlterna }),
  setZonaAlternaId: (zonaAlternaId) => set({ zonaAlternaId }),
  setAliadoId: (aliadoId) => set({ aliadoId }),
  setDescuentoReferidoVet: (descuentoReferidoVet) => set({ descuentoReferidoVet }),
  setEsDonacion: (esDonacion) => set({ esDonacion }),
  setDonacionDestinatario: (donacionDestinatario) => set({ donacionDestinatario }),
  setDonacionMotivo: (donacionMotivo) => set({ donacionMotivo }),
  setItems: (items) => set({ items }),
  togglePromoEnabled: (promoId) =>
    set((state) => ({
      disabledPromoIds: state.disabledPromoIds.includes(promoId)
        ? state.disabledPromoIds.filter((id) => id !== promoId)
        : [...state.disabledPromoIds, promoId],
    })),
  clearCart: () => set(initialState),

  getSubtotalAlimento: () =>
    get().items.filter((i) => i.aplicaDescuento).reduce((acc, i) => acc + i.subtotal, 0),

  getSubtotalSnacks: () =>
    get().items.filter((i) => i.categoria === "snacks").reduce((acc, i) => acc + i.subtotal, 0),

  getSubtotalOtros: () =>
    get().items.filter((i) => !i.aplicaDescuento && i.categoria !== "snacks").reduce((acc, i) => acc + i.subtotal, 0),

  getSubtotal: () =>
    get().items.reduce((acc, i) => acc + i.subtotal, 0),

  getItemCount: () =>
    get().items.reduce((acc, i) => acc + i.cantidad, 0),
    }),
    {
      name: "amatu-cart",
      storage: createJSONStorage(() => sessionStorage),
      // Persistir solo el estado de datos; los getters se recomponen del store.
      partialize: (state) => ({
        items: state.items,
        clienteId: state.clienteId,
        mascotaIds: state.mascotaIds,
        zonaId: state.zonaId,
        fuente: state.fuente,
        fuenteSubtipo: state.fuenteSubtipo,
        notasVentas: state.notasVentas,
        franjaHoraria: state.franjaHoraria,
        metodoPago: state.metodoPago,
        fechaTentativaEntrega: state.fechaTentativaEntrega,
        esDistribuidor: state.esDistribuidor,
        pctDescuentoDistribuidor: state.pctDescuentoDistribuidor,
        tarifaEnvioBase: state.tarifaEnvioBase,
        usaDireccionAlterna: state.usaDireccionAlterna,
        direccionAlterna: state.direccionAlterna,
        complementoAlterna: state.complementoAlterna,
        barrioAlterna: state.barrioAlterna,
        zonaAlternaId: state.zonaAlternaId,
        aliadoId: state.aliadoId,
        descuentoReferidoVet: state.descuentoReferidoVet,
        disabledPromoIds: state.disabledPromoIds,
        esDonacion: state.esDonacion,
        donacionDestinatario: state.donacionDestinatario,
        donacionMotivo: state.donacionMotivo,
      }),
    }
  )
);
