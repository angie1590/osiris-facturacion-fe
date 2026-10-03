export interface LegacyRouteRedirect {
  from: string;
  to: string;
}

export const INVENTORY_LEGACY_REDIRECTS: LegacyRouteRedirect[] = [
  { from: "/inventario/bajas", to: "/inventario/egresos" },
  { from: "/inventario/bajas/nuevo", to: "/inventario/egresos/nuevo" },
  { from: "/inventario/bajas/:id", to: "/inventario/egresos" },
  { from: "/inventario/ajustes", to: "/inventario/ingresos" },
  { from: "/inventario/ajustes/nuevo", to: "/inventario/ingresos/nuevo" },
  { from: "/inventario/ajustes/:id", to: "/inventario/ingresos" },
];

export const MANAGEMENT_LEGACY_REDIRECTS: LegacyRouteRedirect[] = [
  { from: "/admin/company", to: "/empresa" },
];

const ROUTE_PREFIX_REDIRECTS: LegacyRouteRedirect[] = [
  { from: "/change-password", to: "/cambiar-contrasena" },
  { from: "/inventory", to: "/inventario" },
  { from: "/categories", to: "/categorias" },
  { from: "/products", to: "/productos" },
  { from: "/suppliers", to: "/proveedores" },
  { from: "/customers", to: "/clientes" },
  { from: "/recategorize", to: "/recategorizar" },
  { from: "/remap", to: "/remapeos" },
  { from: "/catalogs", to: "/catalogos" },
  { from: "/reports", to: "/reportes/resumen" },
  { from: "/audit", to: "/auditoria" },
  { from: "/admin/users", to: "/admin/usuarios" },
  { from: "/admin/params", to: "/admin/parametros" },
];

export function getSpanishRouteRedirect(pathname: string): string | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  if (normalized === "/login") return "/iniciar-sesion";
  if (normalized === "/403") return "/prohibido";
  if (normalized === "/admin/company") return "/empresa";
  const legacyPrint = normalized.match(/^\/inventory\/egresos\/([^/]+)\/print$/);
  if (legacyPrint) {
    return `/inventario/egresos/${encodeURIComponent(legacyPrint[1])}/imprimir`;
  }

  const legacyInventoryAction = normalized.match(/^\/inventory\/(bajas|ajustes)(?:\/(new|[^/]+))?$/);
  if (legacyInventoryAction) {
    const [, action, suffix] = legacyInventoryAction;
    const destination = action === "bajas" ? "egresos" : "ingresos";
    if (suffix === "new") return `/inventario/${destination}/nuevo`;
    if (suffix) return `/inventario/${destination}`;
    return `/inventario/${destination}`;
  }

  if (normalized === "/products/new") return "/productos?accion=nuevo";
  const legacyProductEdit = normalized.match(/^\/products\/([^/]+)\/edit$/);
  if (legacyProductEdit) return `/productos?editar=${encodeURIComponent(legacyProductEdit[1])}`;
  const legacyProductDetail = normalized.match(/^\/products\/([^/]+)$/);
  if (legacyProductDetail) return `/productos?detalle=${encodeURIComponent(legacyProductDetail[1])}`;
  if (normalized === "/reports") return "/reportes/resumen";

  const prefix = ROUTE_PREFIX_REDIRECTS.find(
    ({ from }) => normalized === from || normalized.startsWith(`${from}/`),
  );
  if (!prefix) return null;
  return `${prefix.to}${normalized.slice(prefix.from.length)}`;
}