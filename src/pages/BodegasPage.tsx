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

interface Bodega { id: string; codigo_bodega: string; nombre_bodega: string; descripcion: string | null; empresa_id: string; sucursal_id: string | null; activo: boolean; }
interface Empresa { id: string; razon_social: string; }
interface Sucursal { id: string; nombre: string; codigo: string; empresa_id: string; }

export default function BodegasPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["bodegas-canonicas"], queryFn: async () => (await api.get<Bodega[]>("/bodegas", { params: { limit: 200, skip: 0 } })).data });
  const empresas = useQuery({ queryKey: ["empresas-canonicas"], queryFn: async () => (await api.get<{ items: Empresa[] }>("/empresas", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const sucursales = useQuery({ queryKey: ["sucursales-canonicas"], queryFn: async () => (await api.get<{ items: Sucursal[] }>("/sucursales", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ codigo_bodega: "", nombre_bodega: "", descripcion: "", empresa_id: "", sucursal_id: "" });
  const create = useMutation({ mutationFn: async () => (await api.post("/bodegas", { ...form, descripcion: form.descripcion || undefined, sucursal_id: form.sucursal_id || undefined, usuario_auditoria: "frontend" })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bodegas-canonicas"] }); setOpen(false); setForm({ codigo_bodega: "", nombre_bodega: "", descripcion: "", empresa_id: "", sucursal_id: "" }); } });
  const columns: Column<Bodega>[] = [
    { key: "codigo", header: "Código", cell: (row) => row.codigo_bodega },
    { key: "nombre", header: "Bodega", cell: (row) => row.nombre_bodega },
    { key: "empresa", header: "Empresa", cell: (row) => empresas.data?.find((item) => item.id === row.empresa_id)?.razon_social || row.empresa_id },
    { key: "sucursal", header: "Sucursal", cell: (row) => sucursales.data?.find((item) => item.id === row.sucursal_id)?.nombre || "Matriz" },
  ];
  const availableBranches = (sucursales.data ?? []).filter((item) => item.empresa_id === form.empresa_id);
  return <div><PageHeader title="Bodegas" description="Ubicaciones de inventario del sistema integrado" actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva bodega</Button>} /><DataTable columns={columns} data={data ?? []} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay bodegas" emptyDescription="Las bodegas registradas aparecerán aquí." /><DetailModal open={open} onClose={() => setOpen(false)} title="Nueva bodega" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => create.mutate()} disabled={create.isPending || !form.codigo_bodega || !form.nombre_bodega || !form.empresa_id}>Guardar</Button></div>}><div className="grid gap-4 sm:grid-cols-2"><FormField label="Código" required><Input value={form.codigo_bodega} onChange={(event) => setForm({ ...form, codigo_bodega: event.target.value })} /></FormField><FormField label="Nombre" required><Input value={form.nombre_bodega} onChange={(event) => setForm({ ...form, nombre_bodega: event.target.value })} /></FormField><FormField label="Empresa" required><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.empresa_id} onChange={(event) => setForm({ ...form, empresa_id: event.target.value, sucursal_id: "" })}><option value="">Selecciona una empresa</option>{(empresas.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.razon_social}</option>)}</select></FormField><FormField label="Sucursal"><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.sucursal_id} onChange={(event) => setForm({ ...form, sucursal_id: event.target.value })} disabled={!form.empresa_id}><option value="">Matriz</option>{availableBranches.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</select></FormField><FormField label="Descripción" className="sm:col-span-2"><Input value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></FormField></div></DetailModal></div>;
}
