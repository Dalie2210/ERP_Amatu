import { create } from "zustand";
import type { CartItem, CartState, FuenteCliente, FranjaHoraria, MetodoPago } from "@/types";

interface CartActions {
  addItem: (item: CartItem) => void;
  removeItem: (productoId: string, varianteId?: string) => void;
  updateQuantity: (productoId: string, cantidad: number, varianteId?: string) => void;
  setCliente: (clienteId: string | null) => void;
  setMascota: (mascotaId: string | null) => void;
  setZona: (zonaId: string | null) => void;
  setFuente: (fuente: FuenteCliente | null, subtipo?: string | null) => void;
  setNotasVentas: (notas: string) => void;
  setFranjaHoraria: (franja: FranjaHoraria) => void;
  setMetodoPago: (metodo: MetodoPago | null) => void;
  setEsContraentrega: (es: boolean) => void;
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
  mascotaId: null,
  zonaId: null,
  fuente: null,
  fuenteSubtipo: null,
  notasVentas: "",
  franjaHoraria: "sin_franja",
  metodoPago: null,
  esContraentrega: false,
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
};

export const useCartStore = create<CartState & CartActions>((set, get) => ({
  ...initialState,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find(
        (i) => i.productoId === item.productoId && i.varianteId === item.varianteId
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productoId === item.productoId && i.varianteId === item.varianteId
              ? { ...i, cantidad: i.cantidad + item.cantidad, subtotal: (i.cantidad + item.cantidad) * i.precioUnitario }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (productoId, varianteId) =>
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productoId === productoId && i.varianteId === varianteId)
      ),
    })),

  updateQuantity: (productoId, cantidad, varianteId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productoId === productoId && i.varianteId === varianteId
          ? { ...i, cantidad, subtotal: cantidad * i.precioUnitario }
          : i
      ),
    })),

  setCliente: (clienteId) => set({ clienteId }),
  setMascota: (mascotaId) => set({ mascotaId }),
  setZona: (zonaId) => set({ zonaId }),
  setFuente: (fuente, subtipo = null) => set({ fuente, fuenteSubtipo: subtipo }),
  setNotasVentas: (notasVentas) => set({ notasVentas }),
  setFranjaHoraria: (franjaHoraria) => set({ franjaHoraria }),
  setMetodoPago: (metodoPago) => set({ metodoPago }),
  setEsContraentrega: (esContraentrega) => set({ esContraentrega }),
  setFechaTentativa: (fechaTentativaEntrega) => set({ fechaTentativaEntrega }),
  setClienteConfig: (esDistribuidor, pctDescuentoDistribuidor, tarifaEnvioBase) =>
    set({ esDistribuidor, pctDescuentoDistribuidor, tarifaEnvioBase }),
  setUsaDireccionAlterna: (usaDireccionAlterna) => set({ usaDireccionAlterna }),
  setDireccionAlterna: (direccionAlterna) => set({ direccionAlterna }),
  setComplementoAlterna: (complementoAlterna) => set({ complementoAlterna }),
  setBarrioAlterna: (barrioAlterna) => set({ barrioAlterna }),
  setZonaAlternaId: (zonaAlternaId) => set({ zonaAlternaId }),
  setAliadoId: (aliadoId) => set({ aliadoId }),
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
}));
