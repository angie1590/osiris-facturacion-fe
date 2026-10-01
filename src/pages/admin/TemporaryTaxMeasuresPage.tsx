import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FormField } from "@/components/shared/FormField";
import { TablePagination } from "@/components/shared/TablePagination";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

type TaxType = "IVA" | "ICE";
type TaxComponent = "PORCENTUAL" | "AD_VALOREM" | "ESPECIFICO";
type MeasureState = "BORRADOR" | "ACTIVA" | "INACTIVA";
type Company = { id: string; razon_social: string; ruc: string };
type ProductCategory = { id: string; nombre: string };
type Product = { id: string; nombre: string; tipo: string; activo?: boolean; categorias: ProductCategory[] };
type ProductTarget = {
  producto_id: string;
  producto_nombre: string;
  factor_cantidad: string | null;
  unidad_gravable: string | null;
};
type Measure = {
  id: string;
  empresa_id: string;
  empresa_nombre: string | null;
  nombre: string;
  referencia_legal: string;
  tipo_impuesto: TaxType;
  componente: TaxComponent;
  fecha_inicio: string;
  fecha_fin: string;
  codigo_impuesto_sri: string;
  codigo_porcentaje_sri: string;
  codigo_sri_confirmado: boolean;
  tarifa: string;
  estado: MeasureState;
  productos: ProductTarget[];
};
type FormTarget = { factor_cantidad: string; unidad_gravable: string };
type FormState = {
  empresa_id: string;
  nombre: string;
  referencia_legal: string;
  tipo_impuesto: TaxType;
  componente: TaxComponent;
  fecha_inicio: string;
  fecha_fin: string;
  codigo_porcentaje_sri: string;
  tarifa: string;
  codigo_sri_confirmado: boolean;
  productos: Record<string, FormTarget>;
};

const EMPTY_FORM: FormState = {
  empresa_id: "",
  nombre: "",
  referencia_legal: "",
  tipo_impuesto: "IVA",
  componente: "PORCENTUAL",
  fecha_inicio: "",
  fecha_fin: "",
  codigo_porcentaje_sri: "",
  tarifa: "",
  codigo_sri_confirmado: false,
  productos: {},
};

const STATE_LABELS: Record<MeasureState, string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activa",
  INACTIVA: "Inactiva",
};
const PRODUCT_PAGE_SIZE = 6;

function isExpired(measure: Measure): boolean {
  return measure.fecha_fin < new Date().toISOString().slice(0, 10);
}

export default function TemporaryTaxMeasuresPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Measure | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [bulkFactor, setBulkFactor] = useState("");
  const [bulkUnit, setBulkUnit] = useState("LITRO_ALCOHOL_PURO");
  const [formError, setFormError] = useState<string | null>(null);

  const measures = useQuery({
    queryKey: ["medidas-tributarias-temporales"],
    queryFn: async () =>
      (await api.get<{ items: Measure[] }>("/medidas-tributarias-temporales", { params: { limit: 200, offset: 0 } })).data.items,
  });
  const companies = useQuery({
    queryKey: ["empresas-canonicas"],
    queryFn: async () =>
      (await api.get<{ items: Company[] }>("/empresas", { params: { limit: 1000, offset: 0, only_active: true } })).data.items,
  });
  const products = useQuery({
    queryKey: ["productos", "medidas-tributarias"],
    queryFn: async () => {
      const allProducts: Product[] = [];
      let offset = 0;
      while (true) {
        const response = await api.get<{
          items: Product[];
          meta: { has_more: boolean; next_offset: number | null };
        }>("/productos", { params: { limit: 1000, offset, only_active: true } });
        allProducts.push(...response.data.items);
        if (!response.data.meta.has_more || response.data.meta.next_offset == null) break;
        offset = response.data.meta.next_offset;
      }
      return allProducts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const targets = Object.entries(form.productos).map(([producto_id, target]) => ({
        producto_id,
        factor_cantidad: form.componente === "ESPECIFICO" ? target.factor_cantidad : null,
        unidad_gravable: form.componente === "ESPECIFICO" ? target.unidad_gravable : null,
      }));
      const payload = {
        empresa_id: form.empresa_id,
        nombre: form.nombre.trim(),
        referencia_legal: form.referencia_legal.trim(),
        tipo_impuesto: form.tipo_impuesto,
        componente: form.componente,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        codigo_impuesto_sri: form.tipo_impuesto === "IVA" ? "2" : "3",
        codigo_porcentaje_sri: form.codigo_porcentaje_sri.trim(),
        codigo_sri_confirmado: form.codigo_sri_confirmado,
        tarifa: form.tarifa,
        productos: targets,
      };
      if (editing) {
        return api.put(`/medidas-tributarias-temporales/${editing.id}`, {
          ...payload,
          empresa_id: undefined,
          tipo_impuesto: undefined,
          componente: undefined,
          codigo_impuesto_sri: undefined,
        });
      }
      return api.post("/medidas-tributarias-temporales", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["medidas-tributarias-temporales"] });
      setOpen(false);
      setFormError(null);
    },
    onError: (error) => setFormError(getApiErrorMessage(error, "No se pudo guardar la medida.")),
  });

  const stateMutation = useMutation({
    mutationFn: async ({ measure, state }: { measure: Measure; state: "ACTIVA" | "INACTIVA" }) =>
      api.patch(`/medidas-tributarias-temporales/${measure.id}/estado`, { estado: state }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["medidas-tributarias-temporales"] }),
    onError: (error) => setFormError(getApiErrorMessage(error, "No se pudo cambiar el estado de la medida.")),
  });

  const filteredMeasures = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-EC");
    return (measures.data ?? []).filter((measure) =>
      `${measure.nombre} ${measure.empresa_nombre ?? ""} ${measure.referencia_legal} ${measure.productos.map((item) => item.producto_nombre).join(" ")}`
        .toLocaleLowerCase("es-EC")
        .includes(term),
    );
  }, [measures.data, search]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLocaleLowerCase("es-EC");
    return (products.data ?? []).filter((product) =>
      product.nombre.toLocaleLowerCase("es-EC").includes(term) &&
      (!productCategoryId || product.categorias.some((category) => category.id === productCategoryId)),
    );
  }, [productCategoryId, productSearch, products.data]);

  const productCategories = useMemo(() => {
    const categories = new Map<string, string>();
    for (const product of products.data ?? []) {
      for (const category of product.categorias) categories.set(category.id, category.nombre);
    }
    return [...categories.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((left, right) => left.nombre.localeCompare(right.nombre, "es-EC"));
  }, [products.data]);

  const visibleProducts = useMemo(() => {
    const start = (productPage - 1) * PRODUCT_PAGE_SIZE;
    return filteredProducts.slice(start, start + PRODUCT_PAGE_SIZE);
  }, [filteredProducts, productPage]);
  const productTotalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE));

  const updateProductFilter = (categoryId: string, term: string) => {
    setProductCategoryId(categoryId);
    setProductSearch(term);
    setProductPage(1);
  };

  const addProductsToSelection = (items: Product[]) => {
    setForm((current) => {
      const selected = { ...current.productos };
      for (const product of items) {
        selected[product.id] = selected[product.id] ?? {
          factor_cantidad: bulkFactor,
          unidad_gravable: bulkUnit,
        };
      }
      return { ...current, productos: selected };
    });
  };

  const applyBulkFactorToSelection = () => {
    if (!bulkFactor || Number(bulkFactor) <= 0) return;
    setForm((current) => ({
      ...current,
      productos: Object.fromEntries(
        Object.entries(current.productos).map(([id, target]) => [id, {
          ...target,
          factor_cantidad: bulkFactor,
          unidad_gravable: bulkUnit,
        }]),
      ),
    }));
  };

  const beginCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, empresa_id: companies.data?.[0]?.id ?? "" });
    setProductSearch("");
    setProductCategoryId("");
    setProductPage(1);
    setBulkFactor("");
    setBulkUnit("LITRO_ALCOHOL_PURO");
    setFormError(null);
    setOpen(true);
  };

  const beginEdit = (measure: Measure) => {
    setEditing(measure);
    setForm({
      empresa_id: measure.empresa_id,
      nombre: measure.nombre,
      referencia_legal: measure.referencia_legal,
      tipo_impuesto: measure.tipo_impuesto,
      componente: measure.componente,
      fecha_inicio: measure.fecha_inicio,
      fecha_fin: measure.fecha_fin,
      codigo_porcentaje_sri: measure.codigo_porcentaje_sri,
      tarifa: measure.tarifa,
      codigo_sri_confirmado: measure.codigo_sri_confirmado,
      productos: Object.fromEntries(measure.productos.map((target) => [target.producto_id, {
        factor_cantidad: target.factor_cantidad ?? "",
        unidad_gravable: target.unidad_gravable ?? "LITRO_ALCOHOL_PURO",
      }])),
    });
    setProductSearch("");
    setProductCategoryId("");
    setProductPage(1);
    setBulkFactor("");
    setBulkUnit("LITRO_ALCOHOL_PURO");
    setFormError(null);
    setOpen(true);
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "referencia_legal" || key === "fecha_inicio" || key === "fecha_fin" || key === "tarifa"
        ? { codigo_sri_confirmado: false }
        : {}),
    }));

  const toggleProduct = (productId: string, checked: boolean) => {
    setForm((current) => {
      const next = { ...current.productos };
      if (checked) next[productId] = next[productId] ?? { factor_cantidad: bulkFactor, unidad_gravable: bulkUnit };
      else delete next[productId];
      return { ...current, productos: next };
    });
  };

  const validateAndSave = () => {
    if (!form.empresa_id || !form.nombre.trim() || form.referencia_legal.trim().length < 8 || !form.fecha_inicio || !form.fecha_fin || !form.codigo_porcentaje_sri.trim() || !form.tarifa || Object.keys(form.productos).length === 0) {
      setFormError("Completa empresa, nombre, referencia legal, vigencia, código SRI, tarifa y al menos un producto.");
      return;
    }
    if (form.fecha_fin < form.fecha_inicio) {
      setFormError("La fecha final debe ser igual o posterior a la inicial.");
      return;
    }
    if (form.componente === "ESPECIFICO" && Object.values(form.productos).some((target) => !target.factor_cantidad || Number(target.factor_cantidad) <= 0 || !target.unidad_gravable)) {
      setFormError("Cada producto requiere un factor gravable positivo y una unidad.");
      return;
    }
    setFormError(null);
    saveMutation.mutate();
  };

  const columns: Column<Measure>[] = [
    { key: "measure", header: "Medida", cell: (row) => <div><p className="font-medium">{row.nombre}</p><p className="line-clamp-1 text-xs text-muted-foreground">{row.referencia_legal}</p></div> },
    { key: "company", header: "Empresa", cell: (row) => row.empresa_nombre ?? "Empresa" },
    { key: "tax", header: "Impuesto", cell: (row) => `${row.tipo_impuesto} · ${row.componente.replaceAll("_", " ")} · ${row.tarifa}${row.componente !== "ESPECIFICO" ? "%" : " / unidad"}` },
    { key: "products", header: "Productos elegibles", cell: (row) => <span title={row.productos.map((item) => item.producto_nombre).join(", ")}>{row.productos.length === 1 ? row.productos[0].producto_nombre : `${row.productos.length} productos`}</span> },
    { key: "period", header: "Vigencia", cell: (row) => <span className="whitespace-nowrap">{row.fecha_inicio} — {row.fecha_fin}</span> },
    { key: "state", header: "Estado", cell: (row) => <Badge variant={row.estado === "ACTIVA" && !isExpired(row) ? "default" : "secondary"}>{isExpired(row) && row.estado === "ACTIVA" ? "Vencida" : STATE_LABELS[row.estado]}</Badge> },
    { key: "actions", header: "Acciones", cell: (row) => <div className="flex flex-wrap gap-2">{row.estado !== "ACTIVA" && <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(row)}>Editar</Button>}{row.estado !== "ACTIVA" ? <Button type="button" size="sm" disabled={stateMutation.isPending || !row.codigo_sri_confirmado} title={!row.codigo_sri_confirmado ? "Confirma el código SRI editando la medida antes de activarla." : undefined} onClick={() => stateMutation.mutate({ measure: row, state: "ACTIVA" })}>Activar</Button> : <Button type="button" size="sm" variant="outline" disabled={stateMutation.isPending} onClick={() => stateMutation.mutate({ measure: row, state: "INACTIVA" })}>Desactivar</Button>}</div> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medidas tributarias temporales"
        description="Administra tarifas excepcionales por vigencia y productos elegibles. No se modificará el catálogo SRI permanente ni las ventas históricas."
        actions={<Button type="button" onClick={beginCreate}><Plus className="mr-2 h-4 w-4" />Nueva medida</Button>}
      />
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>Las medidas inician como borrador. Actívalas solo después de validar la publicación oficial del SRI, el código de porcentaje y el alcance por producto.</AlertDescription>
      </Alert>
      {formError && !open && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
      <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar decreto, empresa o producto" aria-label="Buscar medidas" /></div>
      <DataTable
        columns={columns}
        data={filteredMeasures}
        rowKey={(row) => row.id}
        isLoading={measures.isLoading}
        isError={measures.isError}
        onRetry={measures.refetch}
        emptyHeading="No hay medidas temporales"
        emptyDescription="Crea un borrador con la referencia oficial y productos a los que aplica."
      />

      <Dialog open={open} onOpenChange={(next) => { if (!next) setOpen(false); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar medida temporal" : "Nueva medida tributaria temporal"}</DialogTitle>
            <DialogDescription>
              Define la vigencia y el alcance. Los productos seleccionados conservan la misma medida aunque navegues entre páginas.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
            {editing?.estado === "INACTIVA" && <Alert><AlertDescription>La medida está inactiva. Al editarla quedará inactiva hasta que la revises y la actives nuevamente.</AlertDescription></Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Empresa" required>
                <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.empresa_id} disabled={!!editing} onChange={(event) => updateForm("empresa_id", event.target.value)}>
                  <option value="">Selecciona una empresa</option>
                  {(companies.data ?? []).map((company) => <option key={company.id} value={company.id}>{company.razon_social} · {company.ruc}</option>)}
                </select>
              </FormField>
              <FormField label="Nombre de la medida" required>
                <Input value={form.nombre} onChange={(event) => updateForm("nombre", event.target.value)} placeholder="Ej. Reducción temporal de IVA turístico" />
              </FormField>
              <FormField label="Tipo de impuesto" required>
                <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.tipo_impuesto} disabled={!!editing} onChange={(event) => {
                  const tipo = event.target.value as TaxType;
                  setForm((current) => ({ ...current, tipo_impuesto: tipo, componente: tipo === "IVA" ? "PORCENTUAL" : "AD_VALOREM" }));
                }}>
                  <option value="IVA">IVA</option><option value="ICE">ICE</option>
                </select>
              </FormField>
              {form.tipo_impuesto === "ICE" && <FormField label="Componente ICE" required>
                <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.componente} disabled={!!editing} onChange={(event) => updateForm("componente", event.target.value as TaxComponent)}>
                  <option value="AD_VALOREM">Ad valorem (%)</option><option value="ESPECIFICO">Específico por unidad gravable</option>
                </select>
              </FormField>}
              <FormField label="Fecha inicial inclusiva" required>
                <Input type="date" value={form.fecha_inicio} onChange={(event) => updateForm("fecha_inicio", event.target.value)} />
              </FormField>
              <FormField label="Fecha final inclusiva" required>
                <Input type="date" value={form.fecha_fin} onChange={(event) => updateForm("fecha_fin", event.target.value)} />
              </FormField>
              <FormField label="Código de porcentaje SRI" required>
                <Input value={form.codigo_porcentaje_sri} disabled={!!editing && form.codigo_sri_confirmado} onChange={(event) => setForm((current) => ({ ...current, codigo_porcentaje_sri: event.target.value, codigo_sri_confirmado: false }))} placeholder="Código confirmado en la publicación SRI" />
              </FormField>
              <FormField label={form.componente === "ESPECIFICO" ? "Tarifa por unidad gravable" : "Tarifa (%)"} required>
                <Input type="number" min="0" step="0.000001" value={form.tarifa} onChange={(event) => updateForm("tarifa", event.target.value)} />
              </FormField>
              <FormField label="Referencia legal oficial" required className="sm:col-span-2">
                <textarea className="min-h-20 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm" value={form.referencia_legal} onChange={(event) => updateForm("referencia_legal", event.target.value)} placeholder="Número y fecha del decreto, resolución o publicación oficial" />
              </FormField>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-semibold">Productos elegibles</h3><p className="text-xs text-muted-foreground">Agrega productos por categoría o incorpora el catálogo completo; la selección se conserva al cambiar de página.</p></div>
                  <Badge variant="secondary" aria-live="polite">{Object.keys(form.productos).length} seleccionados</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(180px,0.8fr)_minmax(220px,1fr)]">
                  <FormField label="Filtrar por categoría">
                    <select aria-label="Filtrar por categoría" className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={productCategoryId} onChange={(event) => updateProductFilter(event.target.value, productSearch)}>
                      <option value="">Todas las categorías</option>
                      {productCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Buscar producto">
                    <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={productSearch} onChange={(event) => updateProductFilter(productCategoryId, event.target.value)} placeholder="Buscar por nombre" aria-label="Buscar producto elegible" /></div>
                  </FormField>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={!productCategoryId || filteredProducts.length === 0} onClick={() => addProductsToSelection(filteredProducts)}>
                    Agregar categoría ({productCategoryId ? filteredProducts.length : 0})
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={!products.data?.length} onClick={() => addProductsToSelection(products.data ?? [])}>
                    Agregar todos los productos ({products.data?.length ?? 0})
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={!Object.keys(form.productos).length} onClick={() => updateForm("productos", {})}>
                    Limpiar selección
                  </Button>
                </div>
                {form.componente === "ESPECIFICO" && (
                  <div className="grid gap-3 rounded-md bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <FormField label="Factor inicial para altas masivas">
                      <Input type="number" min="0" step="0.00000001" value={bulkFactor} onChange={(event) => setBulkFactor(event.target.value)} placeholder="Litros de alcohol puro por envase" />
                    </FormField>
                    <FormField label="Unidad gravable">
                      <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={bulkUnit} onChange={(event) => setBulkUnit(event.target.value)}><option value="LITRO_ALCOHOL_PURO">Litro de alcohol puro</option><option value="LITRO_BEBIDA">Litro de bebida</option><option value="UNIDAD">Unidad</option><option value="OTRO">Otra unidad</option></select>
                    </FormField>
                    <Button type="button" size="sm" variant="outline" disabled={!bulkFactor || Object.keys(form.productos).length === 0} onClick={applyBulkFactorToSelection}>Aplicar a selección</Button>
                    <p className="text-xs text-muted-foreground sm:col-span-3">El factor inicial se copia a productos que agregues; puedes corregirlo individualmente en las filas visibles. Verifica graduación y presentación de cada producto.</p>
                  </div>
                )}
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {(products.data ?? []).length === 0 && !products.isLoading ? <p className="p-4 text-sm text-muted-foreground">No hay productos activos disponibles.</p> : filteredProducts.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No hay productos para este filtro.</p> : visibleProducts.map((product) => {
                  const target = form.productos[product.id];
                  return <div key={product.id} className="rounded-md border p-3">
                    <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={!!target} onChange={(event) => toggleProduct(product.id, event.target.checked)} />{product.nombre}<span className="text-xs font-normal text-muted-foreground">{product.tipo}</span><span className="ml-auto text-xs font-normal text-muted-foreground">{product.categorias.map((category) => category.nombre).join(" · ") || "Sin categoría"}</span></label>
                    {target && form.componente === "ESPECIFICO" && <div className="mt-3 grid gap-3 pl-7 sm:grid-cols-2"><FormField label="Unidad gravable por unidad vendida" required><Input type="number" min="0" step="0.00000001" value={target.factor_cantidad} onChange={(event) => setForm((current) => ({ ...current, productos: { ...current.productos, [product.id]: { ...target, factor_cantidad: event.target.value } } }))} placeholder="Ej. litros de alcohol puro por botella" /></FormField><FormField label="Unidad" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={target.unidad_gravable} onChange={(event) => setForm((current) => ({ ...current, productos: { ...current.productos, [product.id]: { ...target, unidad_gravable: event.target.value } } }))}><option value="LITRO_ALCOHOL_PURO">Litro de alcohol puro</option><option value="LITRO_BEBIDA">Litro de bebida</option><option value="UNIDAD">Unidad</option><option value="OTRO">Otra unidad</option></select></FormField></div>}
                  </div>;
                })}
              </div>
              {filteredProducts.length > PRODUCT_PAGE_SIZE && <TablePagination
                page={productPage}
                pageSize={PRODUCT_PAGE_SIZE}
                total={filteredProducts.length}
                totalPages={productTotalPages}
                onPageChange={setProductPage}
                itemLabel="productos"
                className="mt-3 border-t pt-3"
              />}
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <input type="checkbox" className="mt-1" checked={form.codigo_sri_confirmado} onChange={(event) => updateForm("codigo_sri_confirmado", event.target.checked)} />
              <span><span className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />Confirmo el código de porcentaje con la publicación oficial del SRI</span><span className="mt-1 block text-xs">Sin esta confirmación la medida se guarda como borrador y no se podrá activar.</span></span>
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={saveMutation.isPending} onClick={validateAndSave}>{saveMutation.isPending ? "Guardando..." : editing ? "Guardar cambios" : "Guardar borrador"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
