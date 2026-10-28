import type { EffectivePermission } from "../personas/directory";

type PermissionFlag = keyof Pick<EffectivePermission,
  "puede_leer" | "puede_crear" | "puede_actualizar" | "puede_eliminar"
>;
type Requirement = readonly ["CATEGORIAS" | "ATRIBUTOS" | "UNIDADES" | "PRODUCTOS", PermissionFlag];

export const catalogPermissionRequirements = {
  read_categories: [["CATEGORIAS", "puede_leer"]],
  create_category: [["CATEGORIAS", "puede_crear"]],
  update_category: [["CATEGORIAS", "puede_actualizar"]],
  move_category: [["CATEGORIAS", "puede_actualizar"]],
  deactivate_category: [["CATEGORIAS", "puede_eliminar"]],
  reactivate_category: [["CATEGORIAS", "puede_actualizar"]],
  read_category_attributes: [["CATEGORIAS", "puede_leer"], ["ATRIBUTOS", "puede_leer"]],
  configure_mapping: [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"]],
  assign_attribute: [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"]],
  override_mapping: [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"]],
  remove_mapping: [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"]],
  reactivate_mapping: [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"]],
  backfill_mapping: [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"]],
  preview_mapping: [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"]],
  create_and_assign_attribute: [["CATEGORIAS", "puede_actualizar"], ["ATRIBUTOS", "puede_leer"], ["ATRIBUTOS", "puede_crear"]],
  read_attributes: [["ATRIBUTOS", "puede_leer"]],
  create_attribute: [["ATRIBUTOS", "puede_crear"]],
  update_attribute: [["ATRIBUTOS", "puede_actualizar"]],
  deactivate_attribute: [["ATRIBUTOS", "puede_eliminar"]],
  reactivate_attribute: [["ATRIBUTOS", "puede_actualizar"]],
  undo_attribute_change: [["ATRIBUTOS", "puede_actualizar"]],
  annotate_attribute_unit: [["ATRIBUTOS", "puede_actualizar"]],
  preview_attribute_update: [["ATRIBUTOS", "puede_actualizar"]],
  preview_attribute_deactivation: [["ATRIBUTOS", "puede_eliminar"]],
  read_units: [["UNIDADES", "puede_leer"]],
  create_unit: [["UNIDADES", "puede_crear"]],
  update_unit: [["UNIDADES", "puede_actualizar"]],
  deactivate_unit: [["UNIDADES", "puede_eliminar"]],
  reactivate_unit: [["UNIDADES", "puede_actualizar"]],
  read_products: [["PRODUCTOS", "puede_leer"]],
  create_product: [["PRODUCTOS", "puede_crear"]],
  update_product: [["PRODUCTOS", "puede_actualizar"]],
  delete_product: [["PRODUCTOS", "puede_eliminar"]],
} as const satisfies Record<string, readonly Requirement[]>;

export type CatalogOperation = keyof typeof catalogPermissionRequirements;
export type CatalogAccessState = "pendiente" | "error" | "denegado" | "permitido";
export type CatalogAccessContext = { actor: string | null } & (
  | { status: "pendiente" | "error" }
  | { status: "listo"; permissionsActor: string; permissions: readonly EffectivePermission[] }
);

export function catalogAccess(context: CatalogAccessContext, operation: CatalogOperation): CatalogAccessState {
  if (!context.actor) return "denegado";
  if (context.status !== "listo") return context.status;
  if (context.permissionsActor !== context.actor) return "denegado";
  return catalogPermissionRequirements[operation].every(([module, flag]) =>
    context.permissions.some((permission) => permission.codigo === module && permission[flag] === true),
  ) ? "permitido" : "denegado";
}