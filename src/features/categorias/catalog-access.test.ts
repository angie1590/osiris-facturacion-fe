import { describe, expect, it } from "vitest";
import type { EffectivePermission } from "../personas/directory";
import { catalogAccess, catalogPermissionRequirements, type CatalogOperation } from "./catalog-access";

const grant = (codigo: string, flags: Partial<EffectivePermission> = {}): EffectivePermission => ({
  codigo, nombre: codigo, puede_leer: false, puede_crear: false,
  puede_actualizar: false, puede_eliminar: false, ...flags,
});
const ready = (permissions: EffectivePermission[]) => ({
  actor: "actor-a", permissionsActor: "actor-a", status: "listo" as const, permissions,
});

const matrix: Array<[CatalogOperation[], Array<[string, keyof EffectivePermission]>]> = [
  [["read_categories"], [["CATEGORIAS", "puede_leer"]]],
  [["create_category"], [["CATEGORIAS", "puede_crear"]]],
  [["update_category", "move_category", "reactivate_category"], [["CATEGORIAS", "puede_actualizar"]]],
  [["deactivate_category"], [["CATEGORIAS", "puede_eliminar"]]],
  [["read_category_attributes"], [["CATEGORIAS", "puede_leer"], ["ATRIBUTOS", "puede_leer"]]],
  [["configure_mapping", "assign_attribute", "override_mapping", "remove_mapping", "reactivate_mapping", "backfill_mapping", "preview_mapping"], [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"]]],
  [["create_and_assign_attribute"], [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"], ["ATRIBUTOS", "puede_crear"]]],
  [["read_attributes"], [["ATRIBUTOS", "puede_leer"]]],
  [["create_attribute"], [["ATRIBUTOS", "puede_crear"]]],
  [["update_attribute", "reactivate_attribute", "undo_attribute_change", "annotate_attribute_unit", "preview_attribute_update"], [["ATRIBUTOS", "puede_actualizar"]]],
  [["deactivate_attribute", "preview_attribute_deactivation"], [["ATRIBUTOS", "puede_eliminar"]]],
  [["read_units"], [["UNIDADES", "puede_leer"]]],
  [["create_unit"], [["UNIDADES", "puede_crear"]]],
  [["update_unit", "reactivate_unit"], [["UNIDADES", "puede_actualizar"]]],
  [["deactivate_unit"], [["UNIDADES", "puede_eliminar"]]],
  [["read_products"], [["PRODUCTOS", "puede_leer"]]],
  [["create_product"], [["PRODUCTOS", "puede_crear"]]],
  [["update_product"], [["PRODUCTOS", "puede_actualizar"]]],
  [["delete_product"], [["PRODUCTOS", "puede_eliminar"]]],
];

describe("catalog effective access mirrors catalog_permissions.py", () => {
  it("covers exactly every backend operation without invented actions", () => {
    expect(matrix.flatMap(([operations]) => operations).sort()).toEqual(Object.keys(catalogPermissionRequirements).sort());
  });

  for (const [operations, requirements] of matrix) {
    it.each(operations)("requires all effective grants for %s", (operation) => {
      const permissions = ["CATEGORIAS", "ATRIBUTOS", "UNIDADES", "PRODUCTOS"].map((module) =>
        grant(module, Object.fromEntries(requirements.filter(([code]) => code === module).map(([, flag]) => [flag, true]))),
      );
      expect(catalogAccess(ready(permissions), operation)).toBe("permitido");
      expect(catalogPermissionRequirements[operation]).toEqual(requirements);
      for (const [code, flag] of requirements) {
        const missing = permissions.map((permission) => permission.codigo === code ? { ...permission, [flag]: false } : permission);
        expect(catalogAccess(ready(missing), operation)).toBe("denegado");
        expect(catalogAccess(ready(permissions.filter((permission) => permission.codigo !== code)), operation)).toBe("denegado");
      }
    });
  }

  it("distinguishes pending, error, denied and allowed with a local actor", () => {
    expect(catalogAccess({ actor: "a", status: "pendiente" }, "read_categories")).toBe("pendiente");
    expect(catalogAccess({ actor: "a", status: "error" }, "read_categories")).toBe("error");
    expect(catalogAccess({ actor: null, status: "pendiente" }, "read_categories")).toBe("denegado");
    expect(catalogAccess({ ...ready([]), actor: null }, "read_categories")).toBe("denegado");
    expect(catalogAccess(ready([]), "read_categories")).toBe("denegado");
    expect(catalogAccess(ready([grant("CATEGORIAS", { puede_leer: true })]), "read_categories")).toBe("permitido");
  });

  it("does not reuse another actor's permissions or trust role names", () => {
    const permissions = [grant("CATEGORIAS", { puede_actualizar: true }), grant("ATRIBUTOS", { puede_leer: true })];
    expect(catalogAccess({ ...ready(permissions), actor: "actor-b" }, "configure_mapping")).toBe("denegado");
    expect(catalogAccess(ready([grant("admin"), grant("supervisor")]), "configure_mapping")).toBe("denegado");
    expect(catalogAccess(ready([grant("categorias", { puede_leer: true })]), "read_categories")).toBe("denegado");
  });

  it("allows local configuration independently from global mutation and delete", () => {
    const context = ready([grant("CATEGORIAS", { puede_actualizar: true }), grant("ATRIBUTOS", { puede_leer: true })]);
    expect(catalogAccess(context, "configure_mapping")).toBe("permitido");
    for (const operation of ["update_attribute", "deactivate_attribute", "create_and_assign_attribute", "undo_attribute_change"] as const) {
      expect(catalogAccess(context, operation)).toBe("denegado");
    }
    expect(catalogAccess(ready([grant("ATRIBUTOS", { puede_eliminar: true })]), "undo_attribute_change")).toBe("denegado");
  });
});