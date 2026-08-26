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
import { getCategorias, getImpuestosActivos, createProducto } from "@/features/productos/api";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";

export default function ProductosPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "", codigo_barras: "", tipo: "BIEN" as "BIEN" | "SERVICIO", pvp: "", categoria_id: "", impuesto_id: "" });
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["productos"],
    queryFn: async () => (await api.get<{ items: ProductoListado[] }>("/productos", { params: { limit: 1000, offset: 0, only_active: true } })).data,
  });
  const categorias = useQuery({ queryKey: ["categorias-canonicas"], queryFn: getCategorias });
  const impuestos = useQuery({ queryKey: ["impuestos-canonicos"], queryFn: getImpuestosActivos });
  const create = useMutation({
    mutationFn: () => createProducto({
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      codigo_barras: form.codigo_barras || undefined,
      tipo: form.tipo,
      pvp: Number(form.pvp),
      categoria_ids: form.categoria_id ? [form.categoria_id] : undefined,
      impuesto_catalogo_ids: form.impuesto_id ? [form.impuesto_id] : [],
      usuario_auditoria: "frontend",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      setForm({ nombre: "", descripcion: "", codigo_barras: "", tipo: "BIEN", pvp: "", categoria_id: "", impuesto_id: "" });
      setOpen(false);
    },
  });
  const productos = (data?.items ?? []).filter((producto) => producto.nombre.toLowerCase().includes(search.toLowerCase()));
  const columns: Column<ProductoListado>[] = [
    { key: "nombre", header: "Producto", cell: (row) => row.nombre, sortable: true, sortAccessor: (row) => row.nombre },
    { key: "tipo", header: "Tipo", cell: (row) => <Badge variant="secondary">{row.tipo === "BIEN" ? "Bien" : "Servicio"}</Badge> },
    { key: "pvp", header: "PVP", cell: (row) => `$ ${Number(row.pvp).toFixed(2)}`, align: "right" },
    { key: "cantidad", header: "Existencia", cell: (row) => row.cantidad, align: "right" },
  ];
  return (
    <div>
      <PageHeader title="Productos" description="Catálogo de productos del sistema integrado" actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo producto</Button>} />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto" />
      </div>
      <DataTable columns={columns} data={productos} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay productos" emptyDescription="Los productos registrados aparecerán aquí." />
      <DetailModal open={open} onClose={() => setOpen(false)} title="Nuevo producto" subtitle="Completa los datos del producto y selecciona al menos un impuesto." footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => create.mutate()} disabled={create.isPending || !form.nombre || !form.pvp || !form.impuesto_id}>{create.isPending ? "Guardando..." : "Guardar"}</Button></div>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre" required><Input value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></FormField>
          <FormField label="Código de barras"><Input value={form.codigo_barras} onChange={(event) => setForm({ ...form, codigo_barras: event.target.value })} /></FormField>
          <FormField label="Tipo" required><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as "BIEN" | "SERVICIO" })}><option value="BIEN">Bien</option><option value="SERVICIO">Servicio</option></select></FormField>
          <FormField label="PVP" required><Input type="number" min="0.01" step="0.01" value={form.pvp} onChange={(event) => setForm({ ...form, pvp: event.target.value })} /></FormField>
          <FormField label="Categoría"><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.categoria_id} onChange={(event) => setForm({ ...form, categoria_id: event.target.value })}><option value="">Sin categoría</option>{(categorias.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField>
          <FormField label="Impuesto" required><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.impuesto_id} onChange={(event) => setForm({ ...form, impuesto_id: event.target.value })}><option value="">Selecciona un impuesto</option>{(impuestos.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.descripcion} ({item.codigo_sri})</option>)}</select></FormField>
          <FormField label="Descripción" className="sm:col-span-2"><Input value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></FormField>
        </div>
      </DetailModal>
    </div>
  );
}
