import { describe, expect, it } from "vitest";
import { getSpanishRouteRedirect } from "./route-redirects";

describe("getSpanishRouteRedirect", () => {
  it.each([
    ["/login", "/iniciar-sesion"],
    ["/change-password", "/cambiar-contrasena"],
    ["/inventory/ingresos/new", "/inventario/ingresos/new"],
    ["/categories", "/categorias"],
    ["/suppliers", "/proveedores"],
    ["/customers", "/clientes"],
    ["/recategorize", "/recategorizar"],
    ["/remap", "/remapeos"],
    ["/catalogs", "/catalogos"],
    ["/reports/sales", "/reportes/resumen/sales"],
    ["/audit", "/auditoria"],
    ["/admin/users", "/admin/usuarios"],
    ["/admin/params", "/admin/parametros"],
  ])("redirects %s to %s", (source, target) => {
    expect(getSpanishRouteRedirect(source)).toBe(target);
  });

  it("preserves product new, detail, and edit intents in the canonical page", () => {
    expect(getSpanishRouteRedirect("/products/new")).toBe("/productos?accion=nuevo");
    expect(getSpanishRouteRedirect("/products/abc-123")).toBe(
      "/productos?detalle=abc-123",
    );
    expect(getSpanishRouteRedirect("/products/abc-123/edit")).toBe(
      "/productos?editar=abc-123",
    );
  });

  it("keeps legacy write-off and adjustment routes pointed at their equivalent flows", () => {
    expect(getSpanishRouteRedirect("/inventory/bajas/new")).toBe(
      "/inventario/egresos/nuevo",
    );
    expect(getSpanishRouteRedirect("/inventory/ajustes/abc-123")).toBe(
      "/inventario/ingresos",
    );
  });

  it("returns null for an unknown route", () => {
    expect(getSpanishRouteRedirect("/ruta-desconocida")).toBeNull();
  });
});
