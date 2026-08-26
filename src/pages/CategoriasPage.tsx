import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { getCategoriasCanonicas, createCategoria, type Categoria } from "@/features/categorias/api";

export default function CategoriasPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["categorias-canonicas"], queryFn: getCategoriasCanonicas });
  const create = useMutation({ mutationFn: createCategoria, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] }); setOpen(false); setNombre(""); } });
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [search, setSearch] = useState("");
  const filtered = data.filter((item) => item.nombre.toLowerCase().includes(search.toLowerCase()));
  const columns: Column<Categoria>[] = [
    { key: "nombre", header: "Categoría", cell: (row) => row.nombre, sortable: true, sortAccessor: (row) => row.nombre },
    { key: "tipo", header: "Tipo", cell: (row) => row.es_padre ? "Principal" : "Subcategoría" },
    { key: "padre", header: "Categoría padre", cell: (row) => data.find((parent) => parent.id === row.parent_id)?.nombre || "—" },
  ];
  return (
    <div>
      <PageHeader title="Categorías" description="Jerarquía de categorías del sistema integrado" actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva categoría</Button>} />
      <div className="mb-4 max-w-sm"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar categoría" /></div>
      <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay categorías" emptyDescription="Las categorías registradas aparecerán aquí." />
      <DetailModal open={open} onClose={() => setOpen(false)} title="Nueva categoría" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => create.mutate({ nombre, es_padre: true, usuario_auditoria: "frontend" })} disabled={create.isPending || !nombre.trim()}>{create.isPending ? "Guardando..." : "Guardar"}</Button></div>}>
        <FormField label="Nombre" required><Input value={nombre} onChange={(event) => setNombre(event.target.value)} /></FormField>
      </DetailModal>
    </div>
  );
}
