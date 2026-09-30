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
      from: "/inventory/bajas/new",
      to: "/inventory/egresos/new",
    });
    expect(INVENTORY_LEGACY_REDIRECTS).toContainEqual({
      from: "/inventory/ajustes/new",
      to: "/inventory/ingresos/new",
    });
  });
});
