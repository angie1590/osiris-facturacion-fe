import { z } from "zod";
import type { ParsedApiError } from "../../lib/api-error";
import { previewResponseSchema, type PreviewResponse } from "./catalog-contracts";

export type CatalogJson = string | number | boolean | null | readonly CatalogJson[] | CatalogPayload;
export type CatalogPayload = { readonly [key: string]: CatalogJson };
export type CatalogDraftContext = Readonly<{
  actor: string | null;
  target: string;
  operation: string;
  payload: CatalogPayload;
}>;
export type CatalogPreviewRequest = Readonly<{
  context: CatalogDraftContext;
  body: Readonly<{ operacion: string; payload: CatalogPayload }>;
}>;
export type CatalogConfirmationRequest = Readonly<{
  context: CatalogDraftContext;
  body: Readonly<{ precondicion_preview: string; payload: CatalogPayload }>;
}>;
export type CatalogDraftState = Readonly<{
  context: CatalogDraftContext;
  phase: "draft" | "previewing" | "ready" | "confirming" | "succeeded" | "failed" | "stale";
  preview: Readonly<PreviewResponse> | null;
  previewRequest: CatalogPreviewRequest | null;
  confirmationRequest: CatalogConfirmationRequest | null;
  error: Readonly<ParsedApiError> | null;
  needsAvailabilityRefresh: boolean;
}>;

function freeze<Value>(value: Value): Value {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function sameJson(left: CatalogJson, right: CatalogJson): boolean {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length && left.every((value, index) => sameJson(value, right[index]));
  }
  const leftObject = left as CatalogPayload;
  const rightObject = right as CatalogPayload;
  const keys = Object.keys(leftObject);
  return keys.length === Object.keys(rightObject).length && keys.every((key) =>
    Object.hasOwn(rightObject, key) && sameJson(leftObject[key], rightObject[key]),
  );
}

function sameContext(left: CatalogDraftContext, right: CatalogDraftContext): boolean {
  return left.actor === right.actor && left.target === right.target
    && left.operation === right.operation && sameJson(left.payload, right.payload);
}

export function createCatalogDraft(context: CatalogDraftContext): CatalogDraftState {
  z.json().parse(context.payload);
  z.string().nullable().parse(context.actor);
  for (const value of [context.target, context.operation]) z.string().regex(/\S/).parse(value);
  return freeze({
    context: structuredClone(context), phase: "draft", preview: null,
    previewRequest: null, confirmationRequest: null, error: null, needsAvailabilityRefresh: false,
  });
}

export function replaceCatalogDraft(state: CatalogDraftState, context: CatalogDraftContext): CatalogDraftState {
  return sameContext(state.context, context) ? state : createCatalogDraft(context);
}

export function beginCatalogPreview(state: CatalogDraftState): {
  state: CatalogDraftState; request: CatalogPreviewRequest | null;
} {
  if (!state.context.actor?.trim() || state.phase === "confirming" || state.phase === "succeeded") return { state, request: null };
  const request = freeze({
    context: state.context,
    body: { operacion: state.context.operation, payload: state.context.payload },
  });
  return {
    state: freeze({ ...state, phase: "previewing", preview: null, previewRequest: request, error: null }),
    request,
  };
}

export function receiveCatalogPreview(
  state: CatalogDraftState, request: CatalogPreviewRequest, response: unknown,
): CatalogDraftState {
  if (state.phase !== "previewing" || state.previewRequest !== request) return state;
  const parsed = previewResponseSchema.safeParse(response);
  if (!parsed.success || parsed.data.operacion !== state.context.operation) {
    return rejectCatalogPreview(state, request, { message: "Preview incompatible con la operacion solicitada." });
  }
  return freeze({
    ...state, phase: "ready", preview: structuredClone(parsed.data), previewRequest: null,
    error: null, needsAvailabilityRefresh: false,
  });
}

export function rejectCatalogPreview(
  state: CatalogDraftState, request: CatalogPreviewRequest, error: ParsedApiError,
): CatalogDraftState {
  if (state.phase !== "previewing" || state.previewRequest !== request) return state;
  return rejected(state, error);
}

export function beginCatalogConfirmation(state: CatalogDraftState, current: CatalogDraftContext): {
  state: CatalogDraftState; request: CatalogConfirmationRequest | null;
} {
  const next = replaceCatalogDraft(state, current);
  if (next.phase !== "ready" || !next.preview) return { state: next, request: null };
  const request = freeze({
    context: next.context,
    body: { precondicion_preview: next.preview.precondicion_preview, payload: next.context.payload },
  });
  return {
    state: freeze({ ...next, phase: "confirming", confirmationRequest: request }),
    request,
  };
}

function rejected(state: CatalogDraftState, error: ParsedApiError): CatalogDraftState {
  const stale = error.code === "CATALOG_PREVIEW_STALE" || error.code === "ATTRIBUTE_STATE_CHANGED";
  return freeze({
    ...state, phase: stale ? "stale" : "failed", preview: null,
    previewRequest: null, confirmationRequest: null, error: structuredClone(error),
    needsAvailabilityRefresh: true,
  });
}

export function settleCatalogConfirmation(
  state: CatalogDraftState,
  request: CatalogConfirmationRequest,
  result: { ok: true } | { ok: false; error: ParsedApiError },
): CatalogDraftState {
  if (state.phase !== "confirming" || state.confirmationRequest !== request) return state;
  if (!result.ok) return rejected(state, result.error);
  return freeze({ ...state, phase: "succeeded", preview: null, confirmationRequest: null });
}