import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";
import type { ProductoListado } from "@/features/productos/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAtributosDeCategoria, getCategorias, getImpuestosActivos, createProducto, getProducto, saveValoresProducto, updateProducto } from "@/features/productos/api";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";

export default function ProductosPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", codigo_barras: "", tipo: "BIEN" as "BIEN" | "SERVICIO", pvp: "", categoria_id: "", impuesto_id: "" });
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["productos"],
    queryFn: async () => (await api.get<{ items: ProductoListado[] }>("/productos", { params: { limit: 1000, offset: 0, only_active: true } })).data,
  });
  const categorias = useQuery({ queryKey: ["categorias-canonicas"], queryFn: getCategorias });
  const impuestos = useQuery({ queryKey: ["impuestos-canonicos"], queryFn: getImpuestosActivos });
  const categoryAttributes = useQuery({ queryKey: ["categoria-atributos-producto", form.categoria_id], queryFn: () => getAtributosDeCategoria(form.categoria_id), enabled: Boolean(form.categoria_id) });
  const atributos = useQuery({ queryKey: ["atributos-canonicos"], queryFn: async () => (await api.get<{ items: { id: string; nombre: string; tipo_dato: string }[] }>("/atributos", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const create = useMutation({
    mutationFn: async () => {
      const producto = await createProducto({
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      codigo_barras: form.codigo_barras || undefined,
      tipo: form.tipo,
      pvp: Number(form.pvp),
      categoria_ids: form.categoria_id ? [form.categoria_id] : undefined,
      impuesto_catalogo_ids: form.impuesto_id ? [form.impuesto_id] : [],
      usuario_auditoria: "frontend",
      });
      const values = Object.entries(attributeValues).filter(([, value]) => value !== "").map(([atributo_id, valor]) => ({ atributo_id, valor }));
      if (values.length) await saveValoresProducto(producto.id, values);
      return producto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      setForm({ nombre: "", descripcion: "", codigo_barras: "", tipo: "BIEN", pvp: "", categoria_id: "", impuesto_id: "" });
      setAttributeValues({});
      setOpen(false);
    },
  });
  const update = useMutation({ mutationFn: () => updateProducto(editingId!, { nombre: form.nombre, descripcion: form.descripcion || undefined, codigo_barras: form.codigo_barras || undefined, tipo: form.tipo, pvp: Number(form.pvp) }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["productos"] }); setOpen(false); setEditingId(null); } });
  const detail = useQuery({ queryKey: ["producto-canonico", selectedId], queryFn: () => getProducto(selectedId!), enabled: Boolean(selectedId) });
  const openEdit = async (id: string) => { const product = await getProducto(id); setEditingId(id); setForm({ nombre: product.nombre, descripcion: product.descripcion ?? "", codigo_barras: product.codigo_barras ?? "", tipo: product.tipo, pvp: String(product.pvp), categoria_id: "", impuesto_id: "" }); setOpen(true); };
  const productos = (data?.items ?? []).filter((producto) => producto.nombre.toLowerCase().includes(search.toLowerCase()));
  const columns: Column<ProductoListado>[] = [
    { key: "nombre", header: "Producto", cell: (row) => row.nombre, sortable: true, sortAccessor: (row) => row.nombre },
    { key: "tipo", header: "Tipo", cell: (row) => <Badge variant="secondary">{row.tipo === "BIEN" ? "Bien" : "Servicio"}</Badge> },
    { key: "pvp", header: "PVP", cell: (row) => `$ ${Number(row.pvp).toFixed(2)}`, align: "right" },
    { key: "cantidad", header: "Existencia", cell: (row) => row.cantidad, align: "right" },
    { key: "acciones", header: "Acciones", cell: (row) => <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>Ver</Button><Button size="sm" variant="ghost" onClick={() => openEdit(row.id)}>Editar</Button></div> },
  ];
  return (
    <div>
      <PageHeader title="Productos" description="Catálogo de productos del sistema integrado" actions={<Button onClick={() => { setEditingId(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nuevo producto</Button>} />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto" />
      </div>
      <DataTable columns={columns} data={productos} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay productos" emptyDescription="Los productos registrados aparecerán aquí." />
      {detail.data && <DetailModal open={Boolean(selectedId)} onClose={() => setSelectedId(null)} title={detail.data.nombre} sections={[{ title: "Datos del producto", fields: [{ label: "Tipo", value: detail.data.tipo }, { label: "PVP", value: `$ ${Number(detail.data.pvp).toFixed(2)}` }, { label: "Existencia", value: detail.data.cantidad }, { label: "Código de barras", value: detail.data.codigo_barras || "—" }, { label: "Descripción", value: detail.data.descripcion || "—", full: true }] }, ...(detail.data.atributos.length ? [{ title: "Atributos", fields: detail.data.atributos.map((item) => ({ label: item.atributo.nombre, value: item.valor ?? "—" })) }] : []), ...(detail.data.bodegas.length ? [{ title: "Existencias por bodega", fields: detail.data.bodegas.map((item) => ({ label: `${item.codigo_bodega} · ${item.nombre_bodega}`, value: item.cantidad })) }] : [])]} />}
      <DetailModal open={open} onClose={() => { setOpen(false); setEditingId(null); }} title={editingId ? "Editar producto" : "Nuevo producto"} subtitle={editingId ? "Actualiza los datos básicos del producto." : "Completa los datos del producto y selecciona al menos un impuesto."} footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => editingId ? update.mutate() : create.mutate()} disabled={create.isPending || update.isPending || !form.nombre || !form.pvp || (!editingId && !form.impuesto_id)}>{create.isPending || update.isPending ? "Guardando..." : "Guardar"}</Button></div>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre" required><Input value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></FormField>
          <FormField label="Código de barras"><Input value={form.codigo_barras} onChange={(event) => setForm({ ...form, codigo_barras: event.target.value })} /></FormField>
          <FormField label="Tipo" required><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as "BIEN" | "SERVICIO" })}><option value="BIEN">Bien</option><option value="SERVICIO">Servicio</option></select></FormField>
          <FormField label="PVP" required><Input type="number" min="0.01" step="0.01" value={form.pvp} onChange={(event) => setForm({ ...form, pvp: event.target.value })} /></FormField>
          <FormField label="Categoría"><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.categoria_id} onChange={(event) => setForm({ ...form, categoria_id: event.target.value })}><option value="">Sin categoría</option>{(categorias.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField>
          <FormField label="Impuesto" required><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.impuesto_id} onChange={(event) => setForm({ ...form, impuesto_id: event.target.value })}><option value="">Selecciona un impuesto</option>{(impuestos.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.descripcion} ({item.codigo_sri})</option>)}</select></FormField>
          <FormField label="Descripción" className="sm:col-span-2"><Input value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></FormField>
          {categoryAttributes.data?.map((mapping) => {
            const attribute = atributos.data?.find((item) => item.id === mapping.atributo_id);
            if (!attribute) return null;
            return <FormField key={mapping.atributo_id} label={`${attribute.nombre}${mapping.obligatorio ? " *" : ""}`} className="sm:col-span-2"><Input type={attribute.tipo_dato === "integer" || attribute.tipo_dato === "decimal" ? "number" : attribute.tipo_dato === "date" ? "date" : "text"} value={attributeValues[mapping.atributo_id] ?? mapping.valor_default ?? ""} onChange={(event) => setAttributeValues({ ...attributeValues, [mapping.atributo_id]: event.target.value })} /></FormField>;
          })}
        </div>
      </DetailModal>
    </div>
  );
}
