import { describe, expect, it } from "vitest";
import { z } from "zod";
import contract from "../../../contracts/catalog-administration-v1.openapi.json";
import {
  assignmentInputSchema,
  attributeCreateSchema,
  attributeReadSchema,
  attributeUpdateSchema,
  catalogErrorCodeSchema,
  catalogErrorSchema,
  categoryCreateSchema,
  categoryReadSchema,
  categoryTreeSchema,
  categoryTreeNodeSchema,
  categoryUpdateSchema,
  confirmationSchema,
  configurationInputSchema,
  effectiveAttributeSchema,
  effectiveAttributesSchema,
  lifecycleInputSchema,
  pageSchema,
  previewInputSchema,
  previewResponseSchema,
  reversionReadSchema,
  selectableCategorySchema,
  selectableCategoriesSchema,
  unitInputSchema,
  unitReadSchema,
  unitSummarySchema,
  unitUpdateSchema,
} from "./catalog-contracts";

const id = "11111111-1111-4111-8111-111111111111";
const category = {
  id, nombre: "Computadores", parent_id: null, tiene_hijos: false,
  is_default: false, atributos_propios_count: 1, atributos_efectivos_count: 1,
};

describe("target catalog contract (not deployed)", () => {
  it("accepts the bare tree array with recursive hijos, not a page envelope", () => {
    const tree = [{ ...category, hijos: [{ ...category, parent_id: id, hijos: [] }] }];
    expect(categoryTreeSchema.parse(tree)).toEqual(tree);
    expect(categoryTreeSchema.safeParse({ items: tree }).success).toBe(false);
    expect(categoryTreeSchema.safeParse([{ ...category, hijos: [], es_padre: true }]).success).toBe(false);
  });

  it("requires selectable leaves to be active, ordinary and childless", () => {
    const leaf = { ...category, activo: true };
    expect(selectableCategoriesSchema.parse([leaf])).toEqual([leaf]);
    for (const change of [{ activo: false }, { tiene_hijos: true }, { is_default: true }]) {
      expect(selectableCategoriesSchema.safeParse([{ ...leaf, ...change }]).success).toBe(false);
    }
  });

  it("requires expanded origin, restrictions and nullable read fields", () => {
    const effective = {
      mapping_id: id, atributo_id: id, codigo: "memoria_ram", nombre: "Memoria RAM",
      tipo_dato: "integer", unidad: null,
      restricciones: { allow_negative: false, min_value: null, max_value: null },
      select_options: null, catalog_id: null, obligatorio: true, valor_default: 0,
      orden: 0, categoria_origen: { id, nombre: "Computadores" }, profundidad: 0, heredado: false,
    };
    expect(effectiveAttributesSchema.parse([effective])).toEqual([effective]);
    expect(effectiveAttributesSchema.safeParse([{ ...effective, categoria_origen: id }]).success).toBe(false);
    const omitted = { ...effective, unidad: undefined };
    expect(effectiveAttributesSchema.safeParse([omitted]).success).toBe(false);
    expect(effectiveAttributesSchema.safeParse({ items: [effective] }).success).toBe(false);
  });

  it("preserves omitted configuration instead of materializing backend defaults", () => {
    expect(configurationInputSchema.parse({})).toEqual({});
    const explicit = { obligatorio: false, valor_default: null, orden: 0, aplicar_default_a_existentes: false };
    expect(configurationInputSchema.parse(explicit)).toEqual(explicit);
    expect(configurationInputSchema.parse({ valor_default: false })).toEqual({ valor_default: false });
    expect(configurationInputSchema.safeParse({ obligatorio: null }).success).toBe(false);
    expect(configurationInputSchema.safeParse({ aplicar_default_a_existentes: "false" }).success).toBe(false);
  });

  it("requires the flat preview and treats its precondition as opaque", () => {
    const preview = {
      operacion: "actualizar", resumen: "Anotar unidad sin modificar numeros.",
      conteos: { valores_actuales: 0 }, faltantes: [], conversiones: [], incompatibles: [], remapeos: [],
      cambio_unidad: null, requiere_confirmacion: true, acciones_permitidas: ["previsualizar"],
      precondicion_preview: "not.a.jwt",
    };
    expect(previewResponseSchema.parse(preview)).toEqual(preview);
    expect(previewResponseSchema.safeParse({ data: preview }).success).toBe(false);
    expect(previewResponseSchema.safeParse({ ...preview, conteos: { valores: -1 } }).success).toBe(false);
  });
});

const schemas: Record<string, z.ZodType> = {
  UnitInput: unitInputSchema, UnitSummary: unitSummarySchema, UnitRead: unitReadSchema,
  UnitUpdate: unitUpdateSchema, CategoryRead: categoryReadSchema,
  CategoryTreeNode: categoryTreeNodeSchema, SelectableCategory: selectableCategorySchema,
  CategoryCreate: categoryCreateSchema, CategoryUpdate: categoryUpdateSchema,
  ConfigurationInput: configurationInputSchema, AssignmentInput: assignmentInputSchema,
  LifecycleInput: lifecycleInputSchema, AttributeRead: attributeReadSchema,
  AttributeCreate: attributeCreateSchema, AttributeUpdate: attributeUpdateSchema,
  EffectiveAttribute: effectiveAttributeSchema, PreviewResponse: previewResponseSchema,
  ReversionRead: reversionReadSchema, CatalogError: catalogErrorSchema,
  Page_CategoryRead_: pageSchema(categoryReadSchema),
  Page_AttributeRead_: pageSchema(attributeReadSchema), Page_UnitRead_: pageSchema(unitReadSchema),
};
for (const [name, schema] of Object.entries({
  CategoryUpdate: categoryUpdateSchema, AssignmentInput: assignmentInputSchema,
  ConfigurationInput: configurationInputSchema, LifecycleInput: lifecycleInputSchema,
  AttributeUpdate: attributeUpdateSchema, AttributeCreate: attributeCreateSchema,
})) {
  schemas[`Confirmation_${name}_`] = confirmationSchema(schema);
  schemas[`PreviewInput_${name}_`] = previewInputSchema(schema);
}

describe("checked against the local backend OpenAPI, without a sibling repository", () => {
  const components: Record<string, {
    required?: string[]; properties?: Record<string, unknown>; additionalProperties?: boolean;
  }> = contract.components.schemas;

  it("keeps the gate closed and every route explicitly not deployed", () => {
    expect(contract["x-contract-only"]).toBe(true);
    expect(contract["x-deployed"]).toBe(false);
    for (const path of Object.values(contract.paths)) {
      for (const operation of Object.values(path)) {
        expect(operation["x-deployed"]).toBe(false);
        expect(operation["x-contract-only"]).toBe(true);
      }
    }
  });

  it.each(Object.entries(schemas))("checks %s property names and required/optional boundary via Zod v4", (name, schema) => {
    const generated = z.toJSONSchema(schema, { io: "input" });
    const backend = components[name];
    expect(backend, name).toBeDefined();
    expect(Object.keys(generated.properties ?? {}).sort()).toEqual(Object.keys(backend.properties ?? {}).sort());
    expect([...(generated.required ?? [])].sort()).toEqual([...(backend.required ?? [])].sort());
    expect(generated.additionalProperties).toBe(backend.additionalProperties);
  });

  it("checks exact canonical errors and selected scalar constraints", () => {
    expect(catalogErrorCodeSchema.options).toEqual(contract.components.schemas.ErrorDetail.properties.code.enum);
    const unit = z.toJSONSchema(unitInputSchema, { io: "input" });
    expect(unit.properties?.codigo).toMatchObject({ type: "string", minLength: 1, pattern: "^\\S+$" });
    const generatedCode = unit.properties?.codigo;
    if (typeof generatedCode !== "object" || generatedCode === null) throw new Error("Expected a code schema object");
    expect(contract.components.schemas.UnitInput.properties.codigo).toMatchObject(generatedCode);
    const config = z.toJSONSchema(configurationInputSchema, { io: "input" });
    for (const field of ["obligatorio", "aplicar_default_a_existentes"] as const) {
      expect(config.properties?.[field]).toMatchObject({ type: "boolean" });
      expect(config.properties?.[field]).not.toHaveProperty("default");
      expect(contract.components.schemas.ConfigurationInput.properties[field].default).toBe(false);
    }
    expect(config.properties?.orden).toMatchObject({ anyOf: [expect.objectContaining({ type: "integer" }), { type: "null" }] });
    expect(contract.components.schemas.ConfigurationInput.properties.orden.anyOf).toEqual([{ type: "integer" }, { type: "null" }]);
    expect(z.toJSONSchema(attributeUpdateSchema).properties?.tipo_dato).toMatchObject({ enum: contract.components.schemas.AttributeUpdate.properties.tipo_dato.enum });
  });

  it("validates the exact backend tree, leaves, effective, preview and unit examples", () => {
    const paths = contract.paths;
    expect(categoryTreeSchema.safeParse(paths["/api/v1/categorias/arbol"].get.responses["200"].content["application/json"].example).success).toBe(true);
    expect(selectableCategoriesSchema.safeParse(paths["/api/v1/categorias/seleccionables"].get.responses["200"].content["application/json"].example).success).toBe(true);
    const effective = paths["/api/v1/categorias/{id}/atributos-efectivos"].get.responses["200"].content["application/json"].example;
    expect(effectiveAttributesSchema.parse(effective)).toEqual(effective);
    const preview = paths["/api/v1/atributos/{id}/previsualizar"].post.responses["200"].content["application/json"].example;
    expect(previewResponseSchema.parse(preview)).toEqual(preview);
    const unit = paths["/api/v1/unidades/{id}"].get.responses["200"].content["application/json"].example;
    expect(unitReadSchema.parse(unit)).toEqual(unit);
    expect(paths["/api/v1/categorias"].get.responses["200"].content["application/json"].schema).toEqual({ $ref: "#/components/schemas/Page_CategoryRead_" });
    expect(paths["/api/v1/categorias/{id}/atributos/{mapping_id}"].put.requestBody.content["application/json"].schema.anyOf)
      .toEqual([{ $ref: "#/components/schemas/ConfigurationInput" }, { $ref: "#/components/schemas/Confirmation_ConfigurationInput_" }]);
  });

  it("accepts only the real page envelope", () => {
    const page = { items: [], meta: { total: 0, limit: 100, offset: 0, next_offset: null, prev_offset: null, has_more: false, page: 1, page_count: 0 } };
    expect(pageSchema(categoryReadSchema).parse(page)).toEqual(page);
    expect(pageSchema(categoryReadSchema).safeParse([]).success).toBe(false);
    expect(pageSchema(categoryReadSchema).safeParse({ ...page, meta: { ...page.meta, limit: 0 } }).success).toBe(false);
  });

  it.each(["UNIT_DUPLICATE_CODE", "UNIT_DUPLICATE_SYMBOL", "CATALOG_PREVIEW_STALE"])("preserves canonical %s detail, with authorized IDs omitted or supplied", (code) => {
    const error = { detail: { code, message: "Conflicto de catalogo.", conteos: {}, acciones_permitidas: ["previsualizar"] } };
    expect(catalogErrorSchema.parse(error)).toEqual(error);
    expect(catalogErrorSchema.parse({ detail: { ...error.detail, affected_ids: [id] } }).detail.affected_ids).toEqual([id]);
    expect(catalogErrorSchema.safeParse(error.detail).success).toBe(false);
    expect(catalogErrorSchema.safeParse({ detail: { ...error.detail, affected_ids: null } }).success).toBe(false);
    expect(catalogErrorSchema.safeParse({ detail: { ...error.detail, code: "DUPLICATE_UNIT_CODE" } }).success).toBe(false);
  });

  it("preserves exact symbols and rejects invalid unit input", () => {
    const unit = { codigo: "MEGABYTE", nombre: "Megabyte", simbolo: "MB", magnitud_codigo: "DATA_STORAGE" };
    expect(unitInputSchema.parse(unit).simbolo).toBe("MB");
    expect(unitInputSchema.parse({ ...unit, simbolo: "Mb" }).simbolo).toBe("Mb");
    expect(unitUpdateSchema.parse({})).toEqual({});
    expect(unitUpdateSchema.safeParse({ simbolo: null }).success).toBe(false);
    expect(unitInputSchema.safeParse({ ...unit, simbolo: "M B" }).success).toBe(false);
  });

  it("preserves patch null/omission and explicit consent without guessing stateful rules", () => {
    expect(categoryUpdateSchema.parse({})).toEqual({});
    expect(categoryUpdateSchema.parse({ parent_id: null })).toEqual({ parent_id: null });
    expect(categoryUpdateSchema.safeParse({ nombre: null }).success).toBe(false);
    expect(attributeUpdateSchema.safeParse({ tipo_dato: null }).success).toBe(false);
    expect(attributeUpdateSchema.parse({ unidad_id: null, confirmar_anotacion_unidad: false })).toEqual({ unidad_id: null, confirmar_anotacion_unidad: false });
    expect(attributeUpdateSchema.parse({ unidad_id: id })).toEqual({ unidad_id: id });
    expect(attributeUpdateSchema.safeParse({ unidad_id: id, tipo_dato: "string" }).success).toBe(false);
    expect(attributeCreateSchema.safeParse({ nombre: "RAM", tipo_dato: "integer", categoria_id: id, unidad_id: id }).success).toBe(true);
    expect(attributeCreateSchema.safeParse({ nombre: "RAM", tipo_dato: "boolean", categoria_id: id, unidad_id: id }).success).toBe(false);
    expect(assignmentInputSchema.parse({ atributo_id: id, obligatorio: true })).toEqual({ atributo_id: id, obligatorio: true });
    expect(assignmentInputSchema.safeParse({ atributo_id: id, actor: id }).success).toBe(false);
    expect(lifecycleInputSchema.parse({})).toEqual({});
    expect(lifecycleInputSchema.parse({ confirmar: false })).toEqual({ confirmar: false });
    expect(configurationInputSchema.safeParse({ orden: 1.5 }).success).toBe(false);
    expect(configurationInputSchema.safeParse({ valor_default: Infinity }).success).toBe(false);
  });

  it.each([
    { obligatorio: false }, { valor_default: null }, { orden: 0 },
    { aplicar_default_a_existentes: false },
  ])("forbids mapping configuration in global updates but accepts create-and-assign: %j", (config) => {
    expect(attributeUpdateSchema.safeParse(config).success).toBe(false);
    expect(previewInputSchema(attributeUpdateSchema).safeParse({ operacion: "actualizar", payload: config }).success).toBe(false);
    expect(confirmationSchema(attributeUpdateSchema).safeParse({ precondicion_preview: "opaque", payload: config }).success).toBe(false);
    const payload = { nombre: "RAM", tipo_dato: "integer", categoria_id: id, ...config };
    expect(attributeCreateSchema.parse(payload)).toEqual(payload);
  });

  it("gives every confirmation an exact payload schema at its target preview", () => {
    const paths: Record<string, Record<string, {
      [key: string]: unknown;
      requestBody?: { content: { "application/json": { schema: { $ref?: string; anyOf?: { $ref: string }[] } } } };
    }>> = contract.paths;
    const models: Record<string, { [key: string]: unknown; properties?: Record<string, { [key: string]: unknown; $ref?: string }> }> = contract.components.schemas;
    const refs = (path: string, method: string) => {
      const body = paths[path]?.[method]?.requestBody?.content["application/json"].schema;
      return body?.anyOf?.map((item) => item.$ref) ?? (body?.$ref ? [body.$ref] : []);
    };
    const payloads: Record<string, Record<string, unknown>> = {
      CategoryUpdate: { nombre: "Portatiles", parent_id: null },
      AttributeCreate: { nombre: "RAM", tipo_dato: "integer", categoria_id: id, obligatorio: false, valor_default: 0, orden: null, aplicar_default_a_existentes: false },
      AttributeUpdate: { unidad_id: null, confirmar_anotacion_unidad: false },
      AssignmentInput: { atributo_id: id, obligatorio: false, valor_default: 0 },
      ConfigurationInput: { obligatorio: false, valor_default: null, orden: 0, aplicar_default_a_existentes: false },
      LifecycleInput: { confirmar: false },
    };
    const operations: Record<string, string> = { put: "actualizar", delete: "desactivar" };
    let confirmations = 0;
    for (const [path, methods] of Object.entries(paths)) {
      for (const method of Object.keys(methods)) {
        for (const ref of refs(path, method).filter((item) => item.includes("/Confirmation_"))) {
          confirmations += 1;
          const name = ref.split("/").at(-1)!;
          const payloadName = name.slice("Confirmation_".length, -1);
          const previewName = `PreviewInput_${payloadName}_`;
          const target = path.replace(/\/(reactivar|revertir)$/, "");
          expect(refs(`${target}/previsualizar`, "post")).toContain(`#/components/schemas/${previewName}`);
          expect(models[name].properties?.payload.$ref).toBe(models[previewName].properties?.payload.$ref);
          const operacion = operations[method] ?? (path.endsWith("/reactivar") ? "reactivar" : path.endsWith("/revertir") ? "revertir" : payloadName === "AttributeCreate" ? "crear" : "asignar");
          const payload = payloads[payloadName];
          expect(payload).toBeDefined();
          expect(schemas[previewName].parse({ operacion, payload })).toEqual({ operacion, payload });
          expect(schemas[name].parse({ precondicion_preview: "opaque", payload })).toEqual({ precondicion_preview: "opaque", payload });
        }
      }
    }
    expect(confirmations).toBe(11);
  });
});