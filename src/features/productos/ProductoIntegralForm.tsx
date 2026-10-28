import { useEffect, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailModal } from "@/components/shared/DetailModal";
import { ErrorState } from "@/components/shared/ErrorState";
import { FormField } from "@/components/shared/FormField";
import {
  createProductoIntegral,
  getAtributosEfectivos,
  getCategoriasSeleccionables,
  getImpuestosPermitidos,
  getProducto,
  getValoresCatalogo,
  previewCambioCategoriaProducto,
  updateProductoIntegral,
  type ProductoAtributoEfectivo,
  type ProductoCambioCategoriaPreview,
  type ProductoDetalle,
  type ProductoIntegralAttributeInput,
} from "./api";
import { getApiErrorMessage, getApiFieldErrors, parseApiError } from "@/lib/api-error";

interface ProductoIntegralFormProps {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onSuccess: (producto: ProductoDetalle) => void;
}

interface ProductoDraft {
  nombre: string;
  descripcion: string;
  codigo_barras: string;
  tipo: "BIEN" | "SERVICIO";
  pvp: string;
  permite_fracciones: boolean;
  categoria_principal_id: string;
  impuesto_iva_id: string;
  impuesto_ice_id: string;
}

const emptyDraft: ProductoDraft = {
  nombre: "",
  descripcion: "",
  codigo_barras: "",
  tipo: "BIEN",
  pvp: "",
  permite_fracciones: false,
  categoria_principal_id: "",
  impuesto_iva_id: "",
  impuesto_ice_id: "",
};

function valueAsText(value: string | number | boolean | null | undefined): string {
  return value == null ? "" : String(value);
}

function valueForAttribute(
  attribute: ProductoAtributoEfectivo,
  value: string,
): ProductoIntegralAttributeInput["valor"] {
  if (attribute.tipo_dato === "boolean") return value === "true";
  if (attribute.tipo_dato === "integer" || attribute.tipo_dato === "decimal") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return value;
}

function buildAttributeInputs(
  attributes: ProductoAtributoEfectivo[],
  values: Record<string, string>,
  dirtyIds: Set<string>,
  editing: boolean,
  catalogValues: Record<string, string[]>,
  allowMissingRequired = false,
): { inputs: ProductoIntegralAttributeInput[]; errors: Record<string, string> } {
  const inputs: ProductoIntegralAttributeInput[] = [];
  const errors: Record<string, string> = {};

  for (const attribute of attributes) {
    const id = attribute.atributo_id;
    const hasDraftValue = Object.hasOwn(values, id);
    const value = hasDraftValue ? values[id] : valueAsText(attribute.valor_default);
    const field = `atributos.${id}`;

    if (!hasDraftValue && attribute.valor_default != null) continue;

    if (value === "") {
      if (attribute.obligatorio && !allowMissingRequired) errors[field] = "Este valor es obligatorio.";
      else if (editing && dirtyIds.has(id)) inputs.push({ atributo_id: id, valor: null });
      continue;
    }

    if (attribute.tipo_dato === "integer" || attribute.tipo_dato === "decimal") {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        errors[field] = "Ingresa un número válido.";
        continue;
      }
      if (attribute.tipo_dato === "integer" && !Number.isInteger(numberValue)) {
        errors[field] = "Ingresa un número entero.";
        continue;
      }
      const minValue = attribute.restricciones.min_value ?? (
        attribute.restricciones.allow_negative ? null : 0
      );
      const maxValue = attribute.restricciones.max_value;
      if (minValue != null && numberValue < Number(minValue)) {
        errors[field] = `El valor mínimo es ${minValue}.`;
        continue;
      }
      if (maxValue != null && numberValue > Number(maxValue)) {
        errors[field] = `El valor máximo es ${maxValue}.`;
        continue;
      }
    }

    if (
      attribute.tipo_dato === "select" &&
      !(attribute.select_options ?? []).includes(value)
    ) {
      errors[field] = "Selecciona una opción válida.";
      continue;
    }
    if (
      attribute.tipo_dato === "catalog" &&
      !catalogValues[attribute.catalog_id ?? ""]?.includes(value)
    ) {
      errors[field] = "Selecciona un valor vigente del catálogo.";
      continue;
    }

    inputs.push({ atributo_id: id, valor: valueForAttribute(attribute, value) });
  }

  return { inputs, errors };
}

function impactoText(preview: ProductoCambioCategoriaPreview | null) {
  if (!preview) return [];
  return [
    { title: "Se conservarán", items: preview.conservados },
    { title: "Se desactivarán", items: preview.desactivados },
    { title: "Defaults explícitos", items: preview.defaults },
    { title: "Faltan", items: preview.faltantes },
    { title: "Incompatibles", items: preview.incompatibles },
  ];
}

export function ProductoIntegralForm({
  open,
  productId,
  onClose,
  onSuccess,
}: ProductoIntegralFormProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyDraft);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [dirtyAttributeIds, setDirtyAttributeIds] = useState<Set<string>>(new Set());
  const [attributeErrors, setAttributeErrors] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loadedProductId, setLoadedProductId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<ProductoCambioCategoriaPreview | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["producto-canonico", productId],
    queryFn: () => getProducto(productId!),
    enabled: open && Boolean(productId),
  });
  const categories = useQuery({
    queryKey: ["categorias-seleccionables"],
    queryFn: getCategoriasSeleccionables,
    enabled: open,
  });
  const taxes = useQuery({
    queryKey: ["impuestos-producto", draft.tipo],
    queryFn: () => getImpuestosPermitidos(draft.tipo),
    enabled: open,
  });
  const attributes = useQuery({
    queryKey: ["atributos-efectivos-producto", draft.categoria_principal_id],
    queryFn: () => getAtributosEfectivos(draft.categoria_principal_id),
    enabled: open && Boolean(draft.categoria_principal_id),
  });
  const catalogIds = [...new Set(
    (attributes.data ?? [])
      .filter((attribute) => attribute.tipo_dato === "catalog" && attribute.catalog_id)
      .map((attribute) => attribute.catalog_id!),
  )];
  const catalogQueries = useQueries({
    queries: catalogIds.map((catalogId) => ({
      queryKey: ["catalogo-valores", catalogId],
      queryFn: () => getValoresCatalogo(catalogId),
      enabled: open,
    })),
  });
  const catalogValues = Object.fromEntries(
    catalogIds.map((catalogId, index) => [
      catalogId,
      (catalogQueries[index]?.data ?? []).filter((item) => item.is_active).map((item) => item.value),
    ]),
  );
  const taxOptions = taxes.data ?? [];
  const ivaOptions = taxOptions.filter((item) => item.tipo_impuesto === "IVA");
  const iceOptions = taxOptions.filter((item) => item.tipo_impuesto === "ICE");
  const categoryChanged = Boolean(
    productId && detail.data && draft.categoria_principal_id &&
    draft.categoria_principal_id !== detail.data.categoria_principal?.id,
  );

  useEffect(() => {
    if (!open) {
      setLoadedProductId(null);
      setPreview(null);
      setPreviewToken(null);
      setPreviewOpen(false);
      return;
    }
    if (!productId && loadedProductId !== "new") {
      setDraft(emptyDraft);
      setAttributeValues({});
      setDirtyAttributeIds(new Set());
      setAttributeErrors({});
      setFieldErrors({});
      setFormError("");
      setLoadedProductId("new");
    }
  }, [open, productId, loadedProductId]);

  useEffect(() => {
    const product = detail.data;
    if (!open || !productId || !product || loadedProductId === productId) return;

    setDraft({
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      codigo_barras: product.codigo_barras ?? "",
      tipo: product.tipo,
      pvp: String(product.pvp),
      permite_fracciones: product.permite_fracciones,
      categoria_principal_id: product.categoria_principal?.id ?? "",
      impuesto_iva_id: product.impuestos.find((item) => item.tipo_impuesto === "IVA")?.id ?? "",
      impuesto_ice_id: product.impuestos.find((item) => item.tipo_impuesto === "ICE")?.id ?? "",
    });
    setAttributeValues(Object.fromEntries(
      product.atributos.flatMap((item) => item.valor == null ? [] : [[item.atributo.id, String(item.valor)]]),
    ));
    setDirtyAttributeIds(new Set());
    setAttributeErrors({});
    setFieldErrors({});
    setFormError("");
    setLoadedProductId(productId);
  }, [detail.data, loadedProductId, open, productId]);

  const save = useMutation({
    mutationFn: async (token?: string) => {
      const currentAttributes = attributes.data ?? [];
      const built = buildAttributeInputs(
        currentAttributes,
        attributeValues,
        dirtyAttributeIds,
        Boolean(productId),
        catalogValues,
      );
      setAttributeErrors(built.errors);
      if (Object.keys(built.errors).length) {
        throw new Error("Revisa los atributos marcados antes de guardar.");
      }
      if (!draft.categoria_principal_id) throw new Error("Selecciona una categoría principal.");
      if (!draft.impuesto_iva_id) {
        throw new Error("Selecciona una tarifa IVA para el producto.");
      }
      if (categoryChanged && !token) {
        throw new Error("Previsualiza y confirma el cambio de categoría antes de guardar.");
      }

      const payload = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion || null,
        codigo_barras: draft.codigo_barras || null,
        tipo: draft.tipo,
        pvp: Number(draft.pvp),
        permite_fracciones: draft.permite_fracciones,
        categoria_principal_id: draft.categoria_principal_id,
        impuesto_catalogo_ids: [
          draft.impuesto_iva_id,
          iceOptions.some((item) => item.id === draft.impuesto_ice_id)
            ? draft.impuesto_ice_id
            : "",
        ].filter(Boolean),
        atributos: built.inputs,
        ...(token ? { precondicion_preview: token } : {}),
      };
      return productId
        ? updateProductoIntegral(productId, payload)
        : createProductoIntegral(payload);
    },
    onSuccess: (producto) => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.setQueryData(["producto-canonico", producto.id], producto);
      setPreviewOpen(false);
      onSuccess(producto);
      onClose();
    },
    onError: (error) => {
      const code = parseApiError(error).code;
      setFormError(getApiErrorMessage(error, "No se pudo guardar el producto.", {
        CATALOG_PREVIEW_STALE: "El catálogo cambió. Solicita un preview nuevo; el borrador se conservó.",
        PRODUCT_CATEGORY_CHANGE_REQUIRES_PREVIEW: "El cambio de categoría requiere un preview vigente.",
      }));
      const fields = getApiFieldErrors(error);
      setFieldErrors(fields);
      const nextAttributeErrors = Object.fromEntries(
        Object.entries(fields).filter(([key]) => key.startsWith("atributos.")),
      );
      setAttributeErrors(nextAttributeErrors);
      if (code === "CATALOG_PREVIEW_STALE" || code === "PRODUCT_CATEGORY_CHANGE_REQUIRES_PREVIEW") {
        setPreview(null);
        setPreviewToken(null);
        setPreviewOpen(false);
      }
    },
  });

  const previewChange = useMutation({
    mutationFn: () => {
      if (!productId) throw new Error("El preview requiere un producto existente.");
      const built = buildAttributeInputs(
        attributes.data ?? [],
        attributeValues,
        dirtyAttributeIds,
        true,
        catalogValues,
        true,
      );
      setAttributeErrors(built.errors);
      if (Object.keys(built.errors).length) throw new Error("Completa o corrige los atributos antes de previsualizar.");
      return previewCambioCategoriaProducto(productId, {
        categoria_principal_id: draft.categoria_principal_id,
        atributos: built.inputs,
      });
    },
    onSuccess: (result) => {
      setPreview(result);
      setPreviewToken(result.precondicion_preview);
      setFormError("");
      setPreviewOpen(true);
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, "No se pudo previsualizar el cambio de categoría."));
      setPreview(null);
      setPreviewToken(null);
      setPreviewOpen(true);
    },
  });

  function updateAttribute(attributeId: string, value: string) {
    setAttributeValues((current) => ({ ...current, [attributeId]: value }));
    setDirtyAttributeIds((current) => new Set(current).add(attributeId));
    setAttributeErrors((current) => {
      const next = { ...current };
      delete next[`atributos.${attributeId}`];
      return next;
    });
    setPreview(null);
    setPreviewToken(null);
  }

  const formLoading = Boolean(
    productId && (detail.isLoading || loadedProductId !== productId),
  );
  const formLoadError = Boolean(detail.isError || categories.isError || taxes.isError || attributes.isError || catalogQueries.some((query) => query.isError));
  const formLoadErrorMessage = detail.isError
    ? "No se pudo cargar el detalle del producto."
    : categories.isError
      ? "No se pudieron cargar las categorías seleccionables."
      : taxes.isError
        ? "No se pudo cargar el perfil tributario de la empresa."
        : attributes.isError || catalogQueries.some((query) => query.isError)
          ? "No se pudieron cargar los atributos efectivos de la categoría."
          : "No se pudieron cargar los datos del formulario.";
  const attributesLoading = Boolean(
    taxes.isLoading ||
    (draft.categoria_principal_id && (
      attributes.isLoading || catalogQueries.some((query) => query.isLoading)
    )),
  );
  const canConfirmPreview = Boolean(
    preview && previewToken && !preview.faltantes.length && !preview.incompatibles.length,
  );

  return (
    <>
      <DetailModal
        open={open}
        onClose={onClose}
        title={productId ? "Editar producto" : "Nuevo producto"}
        subtitle="Datos, categoría, atributos e impuestos se guardan en una sola operación."
        size="lg"
        loading={formLoading}
        onRetry={() => {
          void detail.refetch();
          void categories.refetch();
          void taxes.refetch();
          if (draft.categoria_principal_id) void attributes.refetch();
        }}
        footer={(
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            {categoryChanged && (
              <Button
                variant="outline"
                onClick={() => previewChange.mutate()}
                disabled={formLoading || attributesLoading || previewChange.isPending}
              >
                {previewChange.isPending ? "Calculando impacto..." : "Previsualizar cambio"}
              </Button>
            )}
            <Button
              onClick={() => save.mutate(previewToken ?? undefined)}
              disabled={formLoading || attributesLoading || save.isPending || !draft.nombre.trim() || !draft.pvp || !draft.categoria_principal_id || !draft.impuesto_iva_id}
            >
              {save.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        )}
      >
        {formLoadError ? (
          <ErrorState
            className="py-8"
            message={formLoadErrorMessage}
            onRetry={() => {
              if (detail.isError) void detail.refetch();
              if (categories.isError) void categories.refetch();
              if (taxes.isError) void taxes.refetch();
              if (attributes.isError) void attributes.refetch();
              catalogQueries.forEach((query) => {
                if (query.isError) void query.refetch();
              });
            }}
          />
        ) : (
          <div className="space-y-6">
            {formError && <p role="alert" className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{formError}</p>}
            <section className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nombre" required error={fieldErrors.nombre}>
                <Input value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} />
              </FormField>
              <FormField label="Código de barras" error={fieldErrors.codigo_barras}>
                <Input value={draft.codigo_barras} onChange={(event) => setDraft({ ...draft, codigo_barras: event.target.value })} />
              </FormField>
              <FormField label="Tipo" required error={fieldErrors.tipo}>
                <select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={draft.tipo} onChange={(event) => setDraft({ ...draft, tipo: event.target.value as ProductoDraft["tipo"] })}>
                  <option value="BIEN">Bien</option><option value="SERVICIO">Servicio</option>
                </select>
              </FormField>
              <FormField label="PVP" required error={fieldErrors.pvp}>
                <Input type="number" min="0.01" step="0.01" value={draft.pvp} onChange={(event) => setDraft({ ...draft, pvp: event.target.value })} />
              </FormField>
              <FormField
                label="Categoría principal"
                required
                error={fieldErrors.categoria_principal_id}
                hint={!categories.isLoading && categories.data?.length === 0 ? "No hay categorías seleccionables." : undefined}
              >
                <select
                  className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                  value={draft.categoria_principal_id}
                  onChange={(event) => {
                    setDraft({ ...draft, categoria_principal_id: event.target.value });
                    setPreview(null);
                    setPreviewToken(null);
                    setFormError("");
                  }}
                >
                  <option value="">Selecciona una categoría</option>
                  {(categories.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                </select>
              </FormField>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={draft.permite_fracciones} onChange={(event) => setDraft({ ...draft, permite_fracciones: event.target.checked })} />
                Permite fracciones
              </label>
              <FormField
                label="IVA"
                required
                error={fieldErrors.impuesto_catalogo_ids}
                hint={!taxes.isLoading && ivaOptions.length === 0 ? "No hay IVA vigente para esta empresa." : undefined}
              >
                <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={draft.impuesto_iva_id} onChange={(event) => setDraft({ ...draft, impuesto_iva_id: event.target.value })}>
                  <option value="">Selecciona un IVA</option>
                  {ivaOptions.map((item) => <option key={item.id} value={item.id}>{item.descripcion} ({item.codigo_sri})</option>)}
                </select>
              </FormField>
              {iceOptions.length > 0 && (
                <FormField label="ICE">
                  <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={draft.impuesto_ice_id} onChange={(event) => setDraft({ ...draft, impuesto_ice_id: event.target.value })}>
                    <option value="">Sin ICE</option>
                    {iceOptions.map((item) => <option key={item.id} value={item.id}>{item.descripcion} ({item.codigo_sri})</option>)}
                  </select>
                </FormField>
              )}
              <FormField label="Descripción" className="sm:col-span-2" error={fieldErrors.descripcion}>
                <Input value={draft.descripcion} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} />
              </FormField>
            </section>

            <section className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Atributos efectivos</h3>
              {!draft.categoria_principal_id ? (
                <p className="text-sm text-muted-foreground">Selecciona una categoría principal.</p>
              ) : attributes.data?.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {attributes.data.map((attribute) => {
                    const id = attribute.atributo_id;
                    const value = Object.hasOwn(attributeValues, id)
                      ? attributeValues[id]
                      : valueAsText(attribute.valor_default);
                    const restrictions = attribute.restricciones;
                    const numeric = attribute.tipo_dato === "integer" || attribute.tipo_dato === "decimal";
                    const min = restrictions.min_value ?? (!restrictions.allow_negative ? "0" : undefined);
                    let control;
                    if (attribute.tipo_dato === "select") {
                      control = <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={value} onChange={(event) => updateAttribute(id, event.target.value)}><option value="">Selecciona una opción</option>{(attribute.select_options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
                    } else if (attribute.tipo_dato === "catalog") {
                      const values = catalogValues[attribute.catalog_id ?? ""] ?? [];
                      control = <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={value} onChange={(event) => updateAttribute(id, event.target.value)}><option value="">Selecciona un valor</option>{values.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
                    } else if (attribute.tipo_dato === "boolean") {
                      control = <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={value} onChange={(event) => updateAttribute(id, event.target.value)}><option value="">Selecciona</option><option value="true">Sí</option><option value="false">No</option></select>;
                    } else {
                      control = <Input type={numeric ? "number" : attribute.tipo_dato === "date" ? "date" : "text"} min={numeric ? min : undefined} max={numeric ? restrictions.max_value ?? undefined : undefined} step={attribute.tipo_dato === "integer" ? "1" : attribute.tipo_dato === "decimal" ? "any" : undefined} value={value} onChange={(event) => updateAttribute(id, event.target.value)} />;
                    }
                    return (
                      <FormField
                        key={id}
                        label={`${attribute.nombre}${attribute.obligatorio ? " *" : ""}`}
                        required={attribute.obligatorio}
                        error={attributeErrors[`atributos.${id}`]}
                        hint={attribute.unidad?.simbolo ? `Unidad: ${attribute.unidad.simbolo}` : attribute.heredado ? `Heredado de ${attribute.categoria_origen.nombre}` : undefined}
                      >
                        {control}
                      </FormField>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">La categoría no tiene atributos efectivos.</p>
              )}
            </section>
          </div>
        )}
      </DetailModal>

      <DetailModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Cambio de categoría"
        subtitle={preview?.resumen ?? "No se pudo calcular el impacto."}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Volver al formulario</Button>
            <Button
              onClick={() => save.mutate(previewToken ?? undefined)}
              disabled={!canConfirmPreview || save.isPending || previewChange.isPending}
            >
              {save.isPending ? "Guardando..." : "Confirmar y guardar"}
            </Button>
          </div>
        )}
      >
        {previewChange.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">Calculando impacto...</p>
        ) : preview ? (
          <div className="space-y-4">
            <p className="text-sm">{preview.categoria_actual_ruta ?? "Sin categoría"} → {preview.categoria_destino_ruta}</p>
            {impactoText(preview).map((group) => (
              <section key={group.title} className="space-y-1">
                <h3 className="text-sm font-semibold">{group.title} ({group.items.length})</h3>
                {group.items.length ? group.items.map((item) => (
                  <p key={`${group.title}-${item.atributo_id}`} className="text-sm text-muted-foreground">
                    {item.nombre}{item.valor != null ? `: ${String(item.valor)}` : ""}{item.motivo ? ` · ${item.motivo}` : ""}
                  </p>
                )) : <p className="text-sm text-muted-foreground">Ninguno</p>}
              </section>
            ))}
          </div>
        ) : (
          <ErrorState message={formError || "No se pudo calcular el impacto."} onRetry={() => previewChange.mutate()} />
        )}
      </DetailModal>
    </>
  );
}