export interface LegacyRouteRedirect {
  from: string;
  to: string;
}

export const INVENTORY_LEGACY_REDIRECTS: LegacyRouteRedirect[] = [
  { from: "/inventory/bajas", to: "/inventory/egresos" },
  { from: "/inventory/bajas/new", to: "/inventory/egresos/new" },
  { from: "/inventory/bajas/:id", to: "/inventory/egresos" },
  { from: "/inventory/ajustes", to: "/inventory/ingresos" },
  { from: "/inventory/ajustes/new", to: "/inventory/ingresos/new" },
  { from: "/inventory/ajustes/:id", to: "/inventory/ingresos" },
];

export const MANAGEMENT_LEGACY_REDIRECTS: LegacyRouteRedirect[] = [
  { from: "/admin/company", to: "/empresa" },
];