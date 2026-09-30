import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/components/shared/Sidebar";

describe("Sidebar NAV_ITEMS", () => {
  it("no incluye la ruta legacy /admin/company", () => {
    const legacy = NAV_ITEMS.find((item) => item.to === "/admin/company");
    expect(legacy).toBeUndefined();
  });

  it("mantiene la ruta canonica /empresa", () => {
    const canonical = NAV_ITEMS.find((item) => item.to === "/empresa");
    expect(canonical).toBeDefined();
  });
});
