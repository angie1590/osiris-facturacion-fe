import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { createCategoria, deleteCategoria, getCategoriasCanonicas, updateCategoria, type Categoria } from "@/features/categorias/api";

export default function CategoriasPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["categorias-canonicas"], queryFn: getCategoriasCanonicas });
  const [editing, setEditing] = useState<Categoria | null>(null);
  const create = useMutation({ mutationFn: createCategoria, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] }); closeModal(); } });
  const update = useMutation({ mutationFn: ({ id, nombre, parent_id, es_padre }: { id: string; nombre: string; parent_id?: string; es_padre: boolean }) => updateCategoria(id, { nombre, parent_id, es_padre, usuario_auditoria: "frontend" }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] }); closeModal(); } });
  const remove = useMutation({ mutationFn: deleteCategoria, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] }) });
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [parentId, setParentId] = useState("");
  const [search, setSearch] = useState("");
  const filtered = data.filter((item) => item.nombre.toLowerCase().includes(search.toLowerCase()));
  const closeModal = () => { setOpen(false); setEditing(null); setNombre(""); setParentId(""); };
  const openEdit = (category: Categoria) => { setEditing(category); setNombre(category.nombre); setParentId(category.parent_id || ""); setOpen(true); };
  const columns: Column<Categoria>[] = [
    { key: "nombre", header: "Categoría", cell: (row) => row.nombre, sortable: true, sortAccessor: (row) => row.nombre },
    { key: "tipo", header: "Tipo", cell: (row) => row.es_padre ? "Principal" : "Subcategoría" },
    { key: "padre", header: "Categoría padre", cell: (row) => data.find((parent) => parent.id === row.parent_id)?.nombre || "—" },
    { key: "acciones", header: "Acciones", cell: (row) => <div className="flex gap-1"><Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Eliminar" className="text-destructive" onClick={() => remove.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button></div> },
  ];
  return (
    <div>
      <PageHeader title="Categorías" description="Jerarquía de categorías del sistema integrado" actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nueva categoría</Button>} />
      <div className="mb-4 max-w-sm"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar categoría" /></div>
      <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay categorías" emptyDescription="Las categorías registradas aparecerán aquí." />
      <DetailModal open={open} onClose={closeModal} title={editing ? "Editar categoría" : "Nueva categoría"} footer={<div className="flex gap-2"><Button variant="outline" onClick={closeModal}>Cancelar</Button><Button onClick={() => editing ? update.mutate({ id: editing.id, nombre, parent_id: parentId || undefined, es_padre: !parentId }) : create.mutate({ nombre, es_padre: !parentId, parent_id: parentId || undefined, usuario_auditoria: "frontend" })} disabled={create.isPending || update.isPending || !nombre.trim()}>{create.isPending || update.isPending ? "Guardando..." : "Guardar"}</Button></div>}>
        <div className="space-y-4"><FormField label="Nombre" required><Input value={nombre} onChange={(event) => setNombre(event.target.value)} /></FormField><FormField label="Categoría padre"><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">Sin padre, categoría principal</option>{data.filter((item) => item.id !== editing?.id && item.es_padre).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField></div>
      </DetailModal>
    </div>
  );
}
