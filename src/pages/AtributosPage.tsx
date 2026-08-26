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

interface Atributo { id: string; nombre: string; tipo_dato: string; activo: boolean; }
const types = ["string", "integer", "decimal", "boolean", "date"];

export default function AtributosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["atributos-canonicos"], queryFn: async () => (await api.get<{ items: Atributo[] }>("/atributos", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const create = useMutation({ mutationFn: async (input: { nombre: string; tipo_dato: string }) => (await api.post("/atributos", { ...input, usuario_auditoria: "frontend" })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["atributos-canonicos"] }); setOpen(false); setNombre(""); } });
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("string");
  const columns: Column<Atributo>[] = [
    { key: "nombre", header: "Atributo", cell: (row) => row.nombre, sortable: true, sortAccessor: (row) => row.nombre },
    { key: "tipo", header: "Tipo de dato", cell: (row) => row.tipo_dato },
  ];
  return <div><PageHeader title="Atributos" description="Campos dinámicos reutilizables para productos y categorías" actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo atributo</Button>} /><DataTable columns={columns} data={data ?? []} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay atributos" emptyDescription="Crea atributos para extender el catálogo de productos." /><DetailModal open={open} onClose={() => setOpen(false)} title="Nuevo atributo" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => create.mutate({ nombre, tipo_dato: tipo })} disabled={create.isPending || !nombre.trim()}>Guardar</Button></div>}><div className="space-y-4"><FormField label="Nombre" required><Input value={nombre} onChange={(event) => setNombre(event.target.value)} /></FormField><FormField label="Tipo de dato" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={tipo} onChange={(event) => setTipo(event.target.value)}>{types.map((item) => <option key={item} value={item}>{item}</option>)}</select></FormField></div></DetailModal></div>;
}
