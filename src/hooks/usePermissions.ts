"use client";

import { useAuth } from "./useAuth";
import type { UserRole } from "@/types";

interface Permissions {
  canCreateOrders: boolean;
  canEditOwnOrders: boolean;
  canEditAnyOrder: boolean;
  canConfirmPayment: boolean;
  canManageLogistics: boolean;
  canViewAllSales: boolean;
  canManageCatalog: boolean;
  canManageUsers: boolean;
  canManageConfig: boolean;
  canViewCommissions: boolean;
  canLiquidateCommissions: boolean;
  canDispatchRoutes: boolean;
  isAdmin: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    canCreateOrders: true,
    canEditOwnOrders: true,
    canEditAnyOrder: true,
    canConfirmPayment: true,
    canManageLogistics: true,
    canViewAllSales: true,
    canManageCatalog: true,
    canManageUsers: true,
    canManageConfig: true,
    canViewCommissions: true,
    canLiquidateCommissions: true,
    canDispatchRoutes: true,
    isAdmin: true,
  },
  vendedor: {
    canCreateOrders: true,
    canEditOwnOrders: true,
    canEditAnyOrder: false,
    canConfirmPayment: false,
    canManageLogistics: false,
    canViewAllSales: true,
    canManageCatalog: false,
    canManageUsers: false,
    canManageConfig: false,
    canViewCommissions: true,
    canLiquidateCommissions: false,
    canDispatchRoutes: false,
    isAdmin: false,
  },
  logistica: {
    canCreateOrders: false,
    canEditOwnOrders: false,
    canEditAnyOrder: false,
    canConfirmPayment: false,
    canManageLogistics: true,
    canViewAllSales: false,
    canManageCatalog: false,
    canManageUsers: false,
    canManageConfig: false,
    canViewCommissions: false,
    canLiquidateCommissions: false,
    canDispatchRoutes: true,
    isAdmin: false,
  },
  contable: {
    canCreateOrders: false,
    canEditOwnOrders: false,
    canEditAnyOrder: false,
    canConfirmPayment: true,
    canManageLogistics: false,
    canViewAllSales: true,
    canManageCatalog: false,
    canManageUsers: false,
    canManageConfig: false,
    canViewCommissions: true,
    canLiquidateCommissions: true,
    canDispatchRoutes: false,
    isAdmin: false,
  },
};

/**
 * Returns permission flags based on the current user's role.
 */
export function usePermissions(): Permissions & { isLoading: boolean } {
  const { role, isLoading } = useAuth();

  const defaultPermissions: Permissions = {
    canCreateOrders: false,
    canEditOwnOrders: false,
    canEditAnyOrder: false,
    canConfirmPayment: false,
    canManageLogistics: false,
    canViewAllSales: false,
    canManageCatalog: false,
    canManageUsers: false,
    canManageConfig: false,
    canViewCommissions: false,
    canLiquidateCommissions: false,
    canDispatchRoutes: false,
    isAdmin: false,
  };

  if (!role) return { ...defaultPermissions, isLoading };

  return { ...ROLE_PERMISSIONS[role], isLoading };
}
