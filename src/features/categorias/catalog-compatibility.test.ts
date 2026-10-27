import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryClient } from "@tanstack/react-query";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import contract from "../../../contracts/catalog-administration-v1.openapi.json";
import api from "../../lib/api";
import { getApiErrorMessage, parseApiError } from "../../lib/api-error";
import { getCategoriasCanonicas, type Categoria } from "./api";
import {
  attributeCreateSchema, attributeReadSchema, attributeUpdateSchema,
  catalogContractStatus, configurationInputSchema, unitReadSchema,
} from "./catalog-contracts";
import {
  beginCatalogConfirmation, beginCatalogPreview, createCatalogDraft,
  receiveCatalogPreview, rejectCatalogPreview, settleCatalogConfirmation,
} from "./catalog-preview-draft";

const attributeId = "11111111-1111-4111-8111-111111111111";
const unitId = "22222222-2222-4222-8222-222222222222";
const categoryId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-10-25T12:00:00Z";

const currentAttributeRead = {
  id: attributeId, nombre: "Memoria RAM", codigo: "memoria_ram", tipo_dato: "integer",
  unidad_id: null, select_options: null, catalog_id: null, allow_negative: false,
  min_value: "0", max_value: null, activo: true,
  creado_en: timestamp, actualizado_en: timestamp, usuario_auditoria: null,
};
const currentUnitRead = {
  id: unitId, codigo: "GIGABYTE", nombre: "Gigabyte", simbolo: "GB",
  magnitud_codigo: "DATA_STORAGE", es_sistema: true, activo: true,
  creado_en: timestamp, actualizado_en: timestamp,
  created_by: null, updated_by: null, usuario_auditoria: null,
};
const currentConflicts = [
  {
    code: "CATEGORY_DUPLICATE_NAME",
    message: "Ya existe una categoria activa o inactiva con ese nombre dentro de la misma categoria padre. Reactiva o renombra la existente.",
    conteos: {},
    acciones_permitidas: ["reactivar", "renombrar"],
  },
  {
    code: "ATTRIBUTE_ALREADY_ASSIGNED",
    message: "El atributo ya esta asignado a la categoria. Si la asignacion esta inactiva, reactiva la existente.",
    conteos: {},
    acciones_permitidas: ["reactivar"],
  },
];

afterEach(() => vi.restoreAllMocks());

describe("delivery 2: current DTO golden fixtures, not deployed target DTOs", () => {
  it("keeps codigo stable across a rename and unidad_id nullable without inventing expanded metadata", () => {
    const renamed = { ...currentAttributeRead, nombre: "RAM disponible", unidad_id: unitId };
    expect(renamed.codigo).toBe(currentAttributeRead.codigo);
    expect(currentAttributeRead.unidad_id).toBeNull();
    expect(renamed.unidad_id).toBe(unitId);
    expect(currentAttributeRead).not.toHaveProperty("unidad");
    expect(currentAttributeRead).not.toHaveProperty("es_sistema");
    expect(currentAttributeRead).not.toHaveProperty("restricciones");
    expect(attributeReadSchema.safeParse(currentAttributeRead).success).toBe(false);
  });

  it("typechecks additive current reads against the actual private manual AtributoOption interface", () => {
    const page = resolve("src/pages/CategoriasPage.tsx");
    const source = ts.createSourceFile(page, readFileSync(page, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const legacyInterface = source.statements.find((statement) =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === "AtributoOption",
    );
    expect(legacyInterface).toBeDefined();
    if (!legacyInterface) throw new Error("Missing manual AtributoOption interface");
    const virtualFile = resolve("src/features/categorias/catalog-compatibility-fixture.ts");
    const code = `${legacyInterface.getText(source)}\n`
      + `const read = ${JSON.stringify(currentAttributeRead)};\n`
      + `const withUnit = { ...read, unidad_id: ${JSON.stringify(unitId)} };\n`
      + "const options: AtributoOption[] = [read, withUnit];\nexport { options };";
    const options: ts.CompilerOptions = {
      strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, types: [],
    };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (filename, languageVersion, onError, shouldCreateNewSourceFile) =>
      filename === virtualFile ? ts.createSourceFile(filename, code, languageVersion, true)
        : getSourceFile(filename, languageVersion, onError, shouldCreateNewSourceFile);
    const program = ts.createProgram([virtualFile], options, host);
    expect(ts.getPreEmitDiagnostics(program).map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    )).toEqual([]);
  });

  it("retains current unit fields while the target API remains explicitly not deployed", () => {
    expect(currentUnitRead).toMatchObject({ es_sistema: true, activo: true, created_by: null, updated_by: null });
    expect({ ...currentUnitRead, es_sistema: false, activo: false }).toMatchObject({ es_sistema: false, activo: false });
    expect(unitReadSchema.safeParse(currentUnitRead).success).toBe(true);
    expect(catalogContractStatus).toBe("target-not-deployed");
    expect(contract["x-contract-only"]).toBe(true);
    expect(contract["x-deployed"]).toBe(false);
  });

  it.each(["MB", "Mb"])("preserves the exact unit symbol %s without local seeding", (simbolo) => {
    const fixture = { ...currentUnitRead, simbolo };
    expect(JSON.parse(JSON.stringify(fixture)).simbolo).toBe(simbolo);
  });
});

describe("delivery 2: target write boundaries remain distinct from current read fixtures", () => {
  it("creates without client-generated codigo and keeps numeric configuration separate from unit metadata", () => {
    const input = { nombre: "Memoria RAM", tipo_dato: "integer", categoria_id: categoryId, unidad_id: unitId };
    const parsed = attributeCreateSchema.parse(input);
    const configuration = configurationInputSchema.parse({ valor_default: 16, obligatorio: false });
    expect(parsed).toEqual(input);
    expect(parsed).not.toHaveProperty("codigo");
    expect(parsed).not.toHaveProperty("unidad");
    expect(parsed).not.toHaveProperty("simbolo");
    expect(configuration).toEqual({ valor_default: 16, obligatorio: false });
    expect(typeof configuration.valor_default).toBe("number");
    expect(JSON.parse(JSON.stringify({ ...parsed, ...configuration })).valor_default).toBe(16);
  });

  it.each([{}, { unidad_id: null }, { unidad_id: unitId }])("preserves the exact update payload %j", (input) => {
    const parsed = attributeUpdateSchema.parse(input);
    expect(parsed).toEqual(input);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(input);
    expect(Object.hasOwn(parsed, "unidad_id")).toBe(Object.hasOwn(input, "unidad_id"));
    expect(parsed).not.toHaveProperty("codigo");
    expect(parsed).not.toHaveProperty("confirmar_anotacion_unidad");
  });

  it.each(["codigo", "id", "activo", "creado_en", "actualizado_en", "es_sistema", "unidad"])("rejects readonly/read metadata %s rather than forwarding a Read to Update", (field) => {
    const value = field === "unidad" ? currentUnitRead : currentAttributeRead[field as keyof typeof currentAttributeRead] ?? true;
    expect(attributeUpdateSchema.safeParse({ nombre: "RAM disponible", [field]: value }).success).toBe(false);
    expect(attributeCreateSchema.safeParse({ nombre: "RAM", tipo_dato: "integer", categoria_id: categoryId, [field]: value }).success).toBe(false);
  });

  it("requires deliberate write selection instead of spreading a read DTO", () => {
    expect(attributeUpdateSchema.safeParse(currentAttributeRead).success).toBe(false);
    const update = attributeUpdateSchema.parse({ nombre: "RAM disponible", unidad_id: unitId });
    expect(Object.keys(update).sort()).toEqual(["nombre", "unidad_id"]);
    const draft = createCatalogDraft({ actor: "authorized-actor", target: `/atributos/${attributeId}`, operation: "actualizar", payload: update });
    expect(beginCatalogPreview(draft).request?.body.payload).toEqual(update);
    expect(beginCatalogPreview(draft).request?.body.payload).not.toHaveProperty("codigo");
  });
});

describe("delivery 2: historical conflicts use existing error and draft helpers", () => {
  it.each(currentConflicts)("preserves exact current $code detail on preview rejection", (detail) => {
    const error = { response: { status: 409, data: { detail } } };
    const parsed = parseApiError(error);
    expect(parsed).toEqual({ code: detail.code, message: detail.message });
    expect(getApiErrorMessage(error, "No se pudo guardar.")).toBe(detail.message);
    const draft = createCatalogDraft({ actor: "authorized-actor", target: `/categorias/${categoryId}`, operation: "actualizar", payload: { nombre: "Computadores", parent_id: null } });
    const started = beginCatalogPreview(draft);
    if (!started.request) throw new Error("Expected preview request");
    const failed = rejectCatalogPreview(started.state, started.request, parsed);
    expect(failed.context).toBe(draft.context);
    expect(failed.error).toEqual(parsed);
    expect(failed.phase).toBe("failed");
    expect(failed.needsAvailabilityRefresh).toBe(true);
    expect(beginCatalogConfirmation(failed, draft.context).request).toBeNull();
    expect(failed.context.payload).not.toHaveProperty("id");
  });

  it.each(currentConflicts)("preserves $code and the original mapping draft on confirmation failure", (detail) => {
    const context = { actor: "authorized-actor", target: `/categorias/${categoryId}/atributos/${attributeId}`, operation: "actualizar", payload: { obligatorio: false, valor_default: 0, orden: null } };
    const started = beginCatalogPreview(createCatalogDraft(context));
    if (!started.request) throw new Error("Expected preview request");
    const preview = contract.paths["/api/v1/categorias/{id}/atributos/{mapping_id}/previsualizar"].post.responses["200"].content["application/json"].example;
    const ready = receiveCatalogPreview(started.state, started.request, preview);
    const confirmation = beginCatalogConfirmation(ready, context);
    if (!confirmation.request) throw new Error("Expected confirmation request");
    const failed = settleCatalogConfirmation(confirmation.state, confirmation.request, {
      ok: false, error: parseApiError({ response: { status: 409, data: { detail } } }),
    });
    expect(failed.context).toBe(ready.context);
    expect(failed.context.payload).toEqual(context.payload);
    expect(failed.error).toEqual({ code: detail.code, message: detail.message });
    expect(failed.phase).toBe("failed");
    expect(failed.preview).toBeNull();
    expect(failed.confirmationRequest).toBeNull();
    expect(beginCatalogConfirmation(failed, context).request).toBeNull();
  });

  it.each(["ATTRIBUTE_DUPLICATE_NAME", "ATTRIBUTE_DUPLICATE_CODE", "UNIT_DUPLICATE_CODE", "UNIT_DUPLICATE_SYMBOL"])("does not alias the target uniqueness code %s", (code) => {
    const detail = { code, message: "Identidad reservada en el catalogo.", conteos: {}, acciones_permitidas: [] };
    expect(parseApiError({ response: { status: 409, data: { detail } } })).toEqual({ code, message: detail.message });
  });
});

describe("delivery 2: additive reads through the existing category API and cache", () => {
  it("preserves protected and ordinary identities through initial fetch and refetch without target endpoint calls", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const items = [
      { id: categoryId, nombre: "Sin clasificar", es_padre: false, is_default: true, parent_id: null, activo: true, tiene_hijos: false },
      { id: attributeId, nombre: "Computadores", es_padre: false, is_default: false, parent_id: null, activo: true, tiene_hijos: false },
    ];
    const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: { items } });
    const post = vi.spyOn(api, "post");
    const put = vi.spyOn(api, "put");
    const remove = vi.spyOn(api, "delete");
    try {
      const query = { queryKey: ["categorias-canonicas"], queryFn: getCategoriasCanonicas };
      expect(await queryClient.fetchQuery(query)).toEqual(items);
      expect(queryClient.getQueryData<Categoria[]>(query.queryKey)).toEqual(items);
      const refreshed = items.map((item) => ({ ...item, actualizado_en: timestamp }));
      get.mockResolvedValueOnce({ data: { items: refreshed } });
      await queryClient.invalidateQueries({ queryKey: query.queryKey });
      expect(await queryClient.fetchQuery(query)).toEqual(refreshed);
      expect(queryClient.getQueryData<Categoria[]>(query.queryKey)?.map((item) => item.id)).toEqual([categoryId, attributeId]);
      expect(get.mock.calls).toEqual(Array.from({ length: 2 }, () => ["/categorias", { params: { limit: 1000, offset: 0, only_active: true } }]));
      expect(post).not.toHaveBeenCalled();
      expect(put).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    } finally {
      queryClient.clear();
    }
  });
});