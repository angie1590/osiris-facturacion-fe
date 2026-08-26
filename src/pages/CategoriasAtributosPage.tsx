import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import api from "@/lib/api";

interface Option { id: string; nombre: string; tipo_dato?: string; }
interface Assignment { id: string; categoria_id: string; atributo_id: string; orden: number | null; obligatorio: boolean | null; valor_default: string | null; }

export default function CategoriasAtributosPage() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["categorias-canonicas"], queryFn: async () => (await api.get<{ items: Option[] }>("/categorias", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const attributes = useQuery({ queryKey: ["atributos-canonicos"], queryFn: async () => (await api.get<{ items: Option[] }>("/atributos", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const assignments = useQuery({ queryKey: ["categorias-atributos"], queryFn: async () => (await api.get<Assignment[]>("/categorias-atributos", { params: { limit: 1000 } })).data });
  const create = useMutation({ mutationFn: async () => (await api.post("/categorias-atributos", { categoria_id: form.categoria_id, atributo_id: form.atributo_id, obligatorio: form.obligatorio, valor_default: form.valor_default || undefined, usuario_auditoria: "frontend" })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categorias-atributos"] }); setOpen(false); } });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ categoria_id: "", atributo_id: "", obligatorio: false, valor_default: "" });
  const categoryName = (id: string) => categories.data?.find((item) => item.id === id)?.nombre || id;
  const attributeName = (id: string) => attributes.data?.find((item) => item.id === id)?.nombre || id;
  const columns: Column<Assignment>[] = [
    { key: "categoria", header: "Categoría", cell: (row) => categoryName(row.categoria_id) },
    { key: "atributo", header: "Atributo", cell: (row) => attributeName(row.atributo_id) },
    { key: "obligatorio", header: "Obligatorio", cell: (row) => row.obligatorio ? "Sí" : "No" },
    { key: "default", header: "Valor por defecto", cell: (row) => row.valor_default || "—" },
  ];
  return <div><PageHeader title="Atributos por categoría" description="Define qué campos dinámicos aplican a cada categoría" actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Asignar atributo</Button>} /><DataTable columns={columns} data={assignments.data ?? []} rowKey={(row) => row.id} isLoading={assignments.isLoading} isError={assignments.isError} onRetry={assignments.refetch} emptyHeading="No hay asignaciones" emptyDescription="Asigna atributos a categorías para personalizar productos." /><DetailModal open={open} onClose={() => setOpen(false)} title="Asignar atributo" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => create.mutate()} disabled={create.isPending || !form.categoria_id || !form.atributo_id}>{create.isPending ? "Guardando..." : "Guardar"}</Button></div>}><div className="space-y-4"><FormField label="Categoría" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.categoria_id} onChange={(event) => setForm({ ...form, categoria_id: event.target.value })}><option value="">Selecciona una categoría</option>{(categories.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField><FormField label="Atributo" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.atributo_id} onChange={(event) => setForm({ ...form, atributo_id: event.target.value })}><option value="">Selecciona un atributo</option>{(attributes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.tipo_dato})</option>)}</select></FormField><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.obligatorio} onChange={(event) => setForm({ ...form, obligatorio: event.target.checked })} /> Obligatorio</label><FormField label="Valor por defecto"><Input value={form.valor_default} onChange={(event) => setForm({ ...form, valor_default: event.target.value })} /></FormField></div></DetailModal></div>;
}
