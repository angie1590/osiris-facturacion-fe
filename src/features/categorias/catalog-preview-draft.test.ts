import { describe, expect, it } from "vitest";
import contract from "../../../contracts/catalog-administration-v1.openapi.json";
import { parseApiError } from "../../lib/api-error";
import { configurationInputSchema, confirmationSchema, previewInputSchema } from "./catalog-contracts";
import {
  beginCatalogConfirmation, beginCatalogPreview, createCatalogDraft, receiveCatalogPreview,
  rejectCatalogPreview, replaceCatalogDraft, settleCatalogConfirmation,
  type CatalogDraftContext, type CatalogPayload,
} from "./catalog-preview-draft";

const context: CatalogDraftContext = {
  actor: "actor-a", target: "/api/v1/categorias/11111111-1111-4111-8111-111111111111/atributos/22222222-2222-4222-8222-222222222222",
  operation: "actualizar",
  payload: { valor_default: 0, orden: null, obligatorio: false, aplicar_default_a_existentes: false },
};
const example = contract.paths["/api/v1/categorias/{id}/atributos/{mapping_id}/previsualizar"].post.responses["200"].content["application/json"].example;
const preview = { ...example, precondicion_preview: "opaque expired-looking token, not a JWT" };

function ready(current = context) {
  const started = beginCatalogPreview(createCatalogDraft(current));
  if (!started.request) throw new Error("Expected a preview ticket");
  return receiveCatalogPreview(started.state, started.request, preview);
}

function confirming(current = context) {
  const started = beginCatalogConfirmation(ready(current), current);
  if (!started.request) throw new Error("Expected a confirmation ticket");
  return { state: started.state, request: started.request };
}

describe("immutable catalog preview draft (no IO or token interpretation)", () => {
  it("clones before deep freeze and preserves omitted/null/zero/false", () => {
    const payload = { ...context.payload, valor_default: 0, select_options: ["A", "B"] };
    const input = { ...context, payload };
    const state = createCatalogDraft(input);
    payload.select_options.push("C");
    payload.valor_default = 7;
    input.actor = "other";
    expect(state.context).toEqual({ ...context, payload: { ...context.payload, select_options: ["A", "B"] } });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.context)).toBe(true);
    expect(Object.isFrozen(state.context.payload)).toBe(true);
    expect(Object.isFrozen(state.context.payload.select_options)).toBe(true);
    expect(() => Object.assign(state.context.payload, { valor_default: 8 })).toThrow(TypeError);
    expect(state.context.payload).not.toHaveProperty("unidad_id");
    expect(state.context.payload.orden).toBeNull();
    expect(state.context.payload.valor_default).toBe(0);
  });

  it("rejects non-JSON payloads instead of silently dropping undefined or serializing NaN", () => {
    expect(() => createCatalogDraft({ ...context, payload: { valor_default: NaN } })).toThrow();
    expect(() => createCatalogDraft({ ...context, payload: { valor_default: undefined } as unknown as CatalogPayload })).toThrow();
    expect(beginCatalogPreview(createCatalogDraft({ ...context, actor: " " })).request).toBeNull();
  });

  it("builds exact wire envelopes, without actor/target or consent injection", () => {
    const started = beginCatalogPreview(createCatalogDraft(context));
    expect(started.request?.body).toEqual({ operacion: "actualizar", payload: context.payload });
    expect(previewInputSchema(configurationInputSchema).parse(started.request?.body)).toEqual(started.request?.body);
    const confirmed = confirming();
    expect(confirmed.request.body).toEqual({ payload: context.payload, precondicion_preview: preview.precondicion_preview });
    expect(confirmationSchema(configurationInputSchema).parse(confirmed.request.body)).toEqual(confirmed.request.body);
    expect(Object.keys(confirmed.request.body).sort()).toEqual(["payload", "precondicion_preview"]);
    expect(confirmed.request.body.payload).not.toHaveProperty("actor");
    expect(confirmed.request.context.actor).toBe(context.actor);
    expect(confirmed.request.body.payload.obligatorio).toBe(false);
    expect(confirmed.request.body.payload.aplicar_default_a_existentes).toBe(false);
  });

  it.each([
    ["actor", { ...context, actor: "actor-b" }],
    ["logout", { ...context, actor: null }],
    ["target", { ...context, target: "/api/v1/atributos/22222222-2222-4222-8222-222222222222" }],
    ["mapping target", { ...context, target: "/api/v1/categorias/category/atributos/mapping-b" }],
    ["operation", { ...context, operation: "desactivar" }],
    ["payload", { ...context, payload: { ...context.payload, valor_default: 1 } }],
    ["null vs omitted", { ...context, payload: { ...context.payload, unidad_id: null } }],
    ["required flag", { ...context, payload: { ...context.payload, obligatorio: true } }],
    ["backfill consent", { ...context, payload: { ...context.payload, aplicar_default_a_existentes: true } }],
    ["false vs omitted", { ...context, payload: { valor_default: 0, orden: null } }],
  ] as const)("invalidates confirmation after changing %s", (name, changed) => {
    const next = beginCatalogConfirmation(ready(), changed);
    expect(next.request).toBeNull();
    expect(next.state.phase).toBe("draft");
    expect(next.state.preview).toBeNull();
    expect(next.state.context).toEqual(changed);
    if (name === "logout") expect(beginCatalogPreview(next.state).request).toBeNull();
  });

  it("does not invalidate for object key ordering alone", () => {
    const state = ready();
    const reordered = { ...context, payload: Object.fromEntries(Object.entries(context.payload).reverse()) };
    expect(replaceCatalogDraft(state, reordered)).toBe(state);
  });

  it("ignores late previews even after returning to the exact previous context", () => {
    const first = beginCatalogPreview(createCatalogDraft(context));
    if (!first.request) throw new Error("Expected ticket");
    const other = replaceCatalogDraft(first.state, { ...context, actor: "actor-b" });
    const returned = replaceCatalogDraft(other, context);
    const second = beginCatalogPreview(returned);
    if (!second.request) throw new Error("Expected ticket");
    expect(receiveCatalogPreview(second.state, first.request, preview)).toBe(second.state);
    expect(rejectCatalogPreview(second.state, first.request, { code: "CATALOG_PREVIEW_STALE" })).toBe(second.state);
    const accepted = receiveCatalogPreview(second.state, second.request, preview);
    expect(accepted.phase).toBe("ready");
    expect(receiveCatalogPreview(accepted, second.request, preview)).toBe(accepted);
  });

  it("accepts only the newest concurrent preview request", () => {
    const first = beginCatalogPreview(createCatalogDraft(context));
    const second = beginCatalogPreview(first.state);
    if (!first.request || !second.request) throw new Error("Expected tickets");
    expect(receiveCatalogPreview(second.state, first.request, preview)).toBe(second.state);
    expect(receiveCatalogPreview(second.state, second.request, preview).phase).toBe("ready");
  });

  it("clones/freezes the response and never interprets token claims or TTL", () => {
    const started = beginCatalogPreview(createCatalogDraft(context));
    if (!started.request) throw new Error("Expected ticket");
    const response = structuredClone(preview);
    const state = receiveCatalogPreview(started.state, started.request, response);
    response.conteos.productos_activos = 999;
    expect(state.preview?.conteos.productos_activos).toBe(example.conteos.productos_activos);
    expect(Object.isFrozen(state.preview?.conteos)).toBe(true);
    expect(beginCatalogConfirmation(state, context).request?.body.precondicion_preview).toBe(preview.precondicion_preview);
  });

  it.each([{ ...preview, operacion: "otra" }, { data: preview }, { ...preview, precondicion_preview: null }])("rejects an incompatible preview: %j", (response) => {
    const started = beginCatalogPreview(createCatalogDraft(context));
    if (!started.request) throw new Error("Expected ticket");
    const state = receiveCatalogPreview(started.state, started.request, response);
    expect(state.phase).toBe("failed");
    expect(state.context.payload).toEqual(context.payload);
    expect(beginCatalogConfirmation(state, context).request).toBeNull();
  });

  it("blocks duplicate confirmation, new previews while submitting and confirmation after success", () => {
    const started = confirming();
    expect(beginCatalogConfirmation(started.state, context).request).toBeNull();
    expect(beginCatalogPreview(started.state).request).toBeNull();
    const success = settleCatalogConfirmation(started.state, started.request, { ok: true });
    expect(success.phase).toBe("succeeded");
    expect(beginCatalogConfirmation(success, context).request).toBeNull();
    expect(beginCatalogPreview(success).request).toBeNull();
    expect(settleCatalogConfirmation(success, started.request, { ok: false, error: {} })).toBe(success);
  });

  it("ignores late mutation success and error after context changes", () => {
    const started = confirming();
    const changed = replaceCatalogDraft(started.state, { ...context, actor: "actor-b" });
    expect(settleCatalogConfirmation(changed, started.request, { ok: true })).toBe(changed);
    expect(settleCatalogConfirmation(changed, started.request, { ok: false, error: { code: "CATALOG_PREVIEW_STALE" } })).toBe(changed);
  });

  it.each(["CATALOG_PREVIEW_STALE", "ATTRIBUTE_STATE_CHANGED"])("preserves draft on %s and demands explicit re-preview", (code) => {
    const started = confirming();
    const error = parseApiError({ response: { status: 409, data: { detail: { code, message: "Estado cambiado" } } } });
    const state = settleCatalogConfirmation(started.state, started.request, { ok: false, error });
    expect(state.phase).toBe("stale");
    expect(state.context).toBe(started.state.context);
    expect(state.error).toEqual(error);
    expect(state.preview).toBeNull();
    expect(state.previewRequest).toBeNull();
    expect(state.confirmationRequest).toBeNull();
    expect(state.needsAvailabilityRefresh).toBe(true);
    expect(beginCatalogConfirmation(state, context).request).toBeNull();
    const fresh = beginCatalogPreview(state);
    if (!fresh.request) throw new Error("Expected explicit fresh ticket");
    const available = receiveCatalogPreview(fresh.state, fresh.request, { ...preview, precondicion_preview: "fresh opaque token" });
    expect(available.needsAvailabilityRefresh).toBe(false);
    expect(beginCatalogConfirmation(available, context).request?.body.precondicion_preview).toBe("fresh opaque token");
  });

  it.each([
    { code: "FORBIDDEN", message: "Sin permiso" },
    { code: "VALIDATION_ERROR", message: "Dato invalido" },
    { message: "Network unavailable" },
    { code: "UNIT_IN_USE", message: "Historia protegida" },
  ])("does not auto-retry or report success after mutation error %j", (error) => {
    const started = confirming();
    const state = settleCatalogConfirmation(started.state, started.request, { ok: false, error });
    expect(state.phase).toBe("failed");
    expect(state.context.payload).toEqual(context.payload);
    expect(state.error).toEqual(error);
    expect(state.confirmationRequest).toBeNull();
    expect(state.previewRequest).toBeNull();
    expect(beginCatalogConfirmation(state, context).request).toBeNull();
  });

  it("preserves draft when preview fails and ignores duplicate error responses", () => {
    const started = beginCatalogPreview(createCatalogDraft(context));
    if (!started.request) throw new Error("Expected ticket");
    const failed = rejectCatalogPreview(started.state, started.request, { message: "Network unavailable" });
    expect(failed.phase).toBe("failed");
    expect(failed.context).toBe(started.state.context);
    expect(rejectCatalogPreview(failed, started.request, {})).toBe(failed);
  });
});