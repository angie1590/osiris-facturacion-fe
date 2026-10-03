import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/components/shared/Sidebar";
import {
  INVENTORY_LEGACY_REDIRECTS,
  MANAGEMENT_LEGACY_REDIRECTS,
} from "@/lib/route-redirects";

describe("Sidebar NAV_ITEMS", () => {
  it("no incluye la ruta legacy /admin/company", () => {
    const legacy = NAV_ITEMS.find((item) => item.to === "/admin/company");
    expect(legacy).toBeUndefined();
  });

  it("mantiene la ruta canonica /empresa", () => {
    const canonical = NAV_ITEMS.find((item) => item.to === "/empresa");
    expect(canonical).toBeDefined();
  });

  it("mantiene los aliases heredados fuera del sidebar", () => {
    const redirects = [
      ...INVENTORY_LEGACY_REDIRECTS,
      ...MANAGEMENT_LEGACY_REDIRECTS,
    ];

    for (const { from } of redirects) {
      expect(NAV_ITEMS.some((item) => item.to === from)).toBe(false);
    }
  });

  it("redirige aliases heredados hacia rutas canonicas", () => {
    expect(MANAGEMENT_LEGACY_REDIRECTS).toContainEqual({
      from: "/admin/company",
      to: "/empresa",
    });
    expect(INVENTORY_LEGACY_REDIRECTS).toContainEqual({
      from: "/inventario/bajas/nuevo",
      to: "/inventario/egresos/nuevo",
    });
    expect(INVENTORY_LEGACY_REDIRECTS).toContainEqual({
      from: "/inventario/ajustes/nuevo",
      to: "/inventario/ingresos/nuevo",
    });
  });

  it("restringe módulos sensibles para operadores", () => {
    const operatorRoutes = NAV_ITEMS.filter((item) =>
      item.roles.includes("operator"),
    ).map((item) => item.to);

    expect(operatorRoutes).toContain("/ventas");
    expect(operatorRoutes).toContain("/cuentas-por-cobrar");
    expect(operatorRoutes).toContain("/inventario/egresos");
    expect(operatorRoutes).not.toContain("/compras");
    expect(operatorRoutes).not.toContain("/empresa");
    expect(operatorRoutes).not.toContain("/reportes/resumen");
    expect(operatorRoutes).not.toContain("/admin/usuarios");
  });

  it("reserva parámetros exclusivamente para administradores", () => {
    const params = NAV_ITEMS.find((item) => item.to === "/admin/parametros");
    expect(params?.roles).toEqual(["admin"]);
  });
});
