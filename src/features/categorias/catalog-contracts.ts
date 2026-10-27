import { z } from "zod";

export const catalogContractStatus = "target-not-deployed" as const;

const text = z.string().min(1).regex(/\S/);
const code = z.string().min(1).regex(/^\S+$/);
const id = z.uuid();
const count = z.int().nonnegative();
const scalar = z.union([z.string(), z.number(), z.boolean()]);
const bound = z.union([z.string(), z.number()]).nullable();
const dataType = z.enum(["string", "integer", "decimal", "boolean", "date", "select", "catalog"]);

export const unitInputSchema = z.strictObject({
  codigo: code, nombre: text, simbolo: code, magnitud_codigo: code,
});
export const unitSummarySchema = unitInputSchema.extend({ id });
export const unitUsageSchema = z.strictObject({
  atributos_activos: count,
  atributos_inactivos: count,
  snapshots_historicos: count,
});
export const unitReadSchema = unitSummarySchema.extend({
  es_sistema: z.boolean(), activo: z.boolean(),
  creado_en: z.iso.datetime({ offset: true, local: true }),
  actualizado_en: z.iso.datetime({ offset: true, local: true }),
  usuario_auditoria: z.string().nullable(),
  created_by: z.string().nullable().optional(),
  updated_by: z.string().nullable().optional(),
  uso: unitUsageSchema.optional(),
});
export const unitUpdateSchema = unitInputSchema.partial();

const categoryOriginSchema = z.strictObject({ id, nombre: text });
const categoryFields = {
  ...categoryOriginSchema.shape, parent_id: id.nullable(), tiene_hijos: z.boolean(),
  is_default: z.boolean(), atributos_propios_count: count, atributos_efectivos_count: count,
};
export const categoryReadSchema = z.strictObject({ ...categoryFields, activo: z.boolean() });
const categoryTreeBaseSchema = z.strictObject(categoryFields);
export type CategoryTreeNode = z.infer<typeof categoryTreeBaseSchema> & { hijos: CategoryTreeNode[] };
export const categoryTreeNodeSchema: z.ZodType<CategoryTreeNode> = categoryTreeBaseSchema.extend({
  hijos: z.lazy(() => z.array(categoryTreeNodeSchema)),
});
export const categoryTreeSchema = z.array(categoryTreeNodeSchema);
export const selectableCategorySchema = categoryReadSchema.extend({
  tiene_hijos: z.literal(false), is_default: z.literal(false), activo: z.literal(true),
});
export const selectableCategoriesSchema = z.array(selectableCategorySchema);
export const categoryCreateSchema = z.strictObject({ nombre: text, parent_id: id.nullable().optional() });
export const categoryUpdateSchema = categoryCreateSchema.partial();

export const configurationInputSchema = z.strictObject({
  obligatorio: z.boolean().optional(), valor_default: scalar.nullable().optional(),
  orden: z.int().nullable().optional(), aplicar_default_a_existentes: z.boolean().optional(),
});
export const assignmentInputSchema = configurationInputSchema.extend({
  atributo_id: id,
  precondicion_preview: text.nullable().optional(),
});
export const lifecycleInputSchema = z.strictObject({ confirmar: z.boolean().optional() });
const restrictionsSchema = z.strictObject({
  allow_negative: z.boolean(), min_value: bound, max_value: bound,
});
const attributeReadFields = {
  codigo: z.string().regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/), nombre: text,
  tipo_dato: dataType, unidad: unitSummarySchema.nullable(), restricciones: restrictionsSchema,
  select_options: z.array(text).nullable(), catalog_id: id.nullable(),
};
const numericUnit = (value: { tipo_dato?: string; unidad?: unknown; unidad_id?: unknown }) =>
  (value.unidad == null && value.unidad_id == null)
  || value.tipo_dato === undefined
  || value.tipo_dato === "integer" || value.tipo_dato === "decimal";

export const attributeReadSchema = z.strictObject({
  id, ...attributeReadFields, activo: z.boolean(),
}).refine(numericUnit, "ATTRIBUTE_UNIT_INVALID_TYPE");
export const effectiveAttributeSchema = z.strictObject({
  mapping_id: id, atributo_id: id, ...attributeReadFields,
  obligatorio: z.boolean(), valor_default: scalar.nullable(), orden: z.int().nullable(),
  categoria_origen: categoryOriginSchema, profundidad: count, heredado: z.boolean(),
}).refine(numericUnit, "ATTRIBUTE_UNIT_INVALID_TYPE");
export const effectiveAttributesSchema = z.array(effectiveAttributeSchema);

const attributeInputFields = {
  nombre: text, tipo_dato: dataType, unidad_id: id.nullable().optional(),
  select_options: z.array(text).nullable().optional(), catalog_id: id.nullable().optional(),
  allow_negative: z.boolean().optional(), min_value: bound.optional(), max_value: bound.optional(),
  confirmar_anotacion_unidad: z.boolean().optional(),
};
export const attributeCreateSchema = z.strictObject({
  ...attributeInputFields, ...configurationInputSchema.shape, categoria_id: id,
}).refine(numericUnit, "ATTRIBUTE_UNIT_INVALID_TYPE");
export const attributeUpdateSchema = z.strictObject({
  ...attributeInputFields,
  precondicion_preview: text.nullable().optional(),
}).partial()
  .refine(numericUnit, "ATTRIBUTE_UNIT_INVALID_TYPE");

const impactItemSchema = z.strictObject({ id, nombre: text, motivo: text });
export const previewResponseSchema = z.strictObject({
  operacion: text, resumen: text, conteos: z.record(z.string(), count),
  faltantes: z.array(impactItemSchema), conversiones: z.array(impactItemSchema),
  incompatibles: z.array(impactItemSchema), remapeos: z.array(impactItemSchema),
  cambio_unidad: z.strictObject({
    anterior: unitSummarySchema.nullable(), posterior: unitSummarySchema.nullable(),
  }).nullable(),
  requiere_confirmacion: z.boolean(), acciones_permitidas: z.array(text), precondicion_preview: text,
});
export const previewInputSchema = <Schema extends z.ZodType>(payload: Schema) =>
  z.strictObject({ operacion: text, payload });
export const confirmationSchema = <Schema extends z.ZodType>(payload: Schema) =>
  z.strictObject({ precondicion_preview: text, payload });

export const catalogErrorCodeSchema = z.enum([
  "CATEGORY_DUPLICATE_NAME", "CATEGORY_CYCLE", "CATEGORY_PARENT_INACTIVE", "CATEGORY_NOT_LEAF",
  "CATEGORY_DEFAULT_PROTECTED", "CATEGORY_HAS_ACTIVE_CHILDREN", "CATEGORY_PRODUCTS_HAVE_STOCK",
  "CATEGORY_CHANGE_REQUIRES_CONFIRMATION", "ATTRIBUTE_DUPLICATE_NAME", "ATTRIBUTE_DUPLICATE_CODE",
  "ATTRIBUTE_NOT_APPLICABLE", "ATTRIBUTE_ALREADY_ASSIGNED", "ATTRIBUTE_INVALID_TYPE",
  "ATTRIBUTE_HAS_PENDING_REMAPS", "ATTRIBUTE_STATE_CHANGED", "ATTRIBUTE_UNIT_INVALID_TYPE",
  "ATTRIBUTE_UNIT_ANNOTATION_REQUIRES_CONFIRMATION", "ATTRIBUTE_UNIT_CHANGE_REQUIRES_CONVERSION",
  "ATTRIBUTE_UNIT_REMOVAL_REQUIRES_MIGRATION", "CATEGORY_ATTRIBUTE_IN_USE",
  "CATEGORY_ATTRIBUTE_REMOVAL_REQUIRES_CONFIRMATION", "REQUIRED_ATTRIBUTE_MISSING",
  "DEFAULT_VALUE_INVALID", "PRODUCT_REQUIRED_ATTRIBUTES_MISSING", "UNIT_DUPLICATE_CODE",
  "UNIT_DUPLICATE_SYMBOL", "UNIT_IN_USE", "UNIT_PROTECTED", "UNIT_INACTIVE", "CATALOG_PREVIEW_STALE",
]);
export const catalogErrorSchema = z.strictObject({
  detail: z.strictObject({
    code: catalogErrorCodeSchema, message: text, conteos: z.record(z.string(), count),
    affected_ids: z.array(id).optional(), acciones_permitidas: z.array(text),
  }),
});
export const reversionReadSchema = z.strictObject({
  disponible: z.boolean(), resumen: text, acciones_permitidas: z.array(text),
});

const paginationSchema = z.strictObject({
  total: count, limit: z.int().positive(), offset: count, next_offset: count.nullable(),
  prev_offset: count.nullable(), has_more: z.boolean(), page: z.int().positive(), page_count: count,
});
export const pageSchema = <Schema extends z.ZodType>(item: Schema) =>
  z.strictObject({ items: z.array(item), meta: paginationSchema });

export type CategoryRead = z.infer<typeof categoryReadSchema>;
export type EffectiveAttribute = z.infer<typeof effectiveAttributeSchema>;
export type ConfigurationInput = z.infer<typeof configurationInputSchema>;
export type PreviewResponse = z.infer<typeof previewResponseSchema>;
export type CatalogError = z.infer<typeof catalogErrorSchema>;