/**
 * Shipping cost calculator for Amatu ERP
 *
 * Zones and rates are loaded from the database (zonas_envio table).
 * This module provides helper functions for the cart UI.
 *
 * Full implementation in Sprint 5.
 */

export interface ZonaEnvio {
  id: string;
  nombre: string;
  localidades: string;
  tarifaCliente: number;
}

/**
 * Returns the shipping rate for a given zone.
 */
export function getTarifaEnvio(zona: ZonaEnvio | null): number {
  return zona?.tarifaCliente ?? 0;
}
