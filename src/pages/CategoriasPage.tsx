import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/api-error";
import { createCategoria, deleteCategoria, getCategoriasCanonicas, updateCategoria, type Categoria } from "@/features/categorias/api";

export default function CategoriasPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["categorias-canonicas"], queryFn: getCategoriasCanonicas });
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [collisionTarget, setCollisionTarget] = useState<{
    id: string;
    nombre: string;
    parent_id?: string;
    es_padre: boolean;
    message: string;
  } | null>(null);
  const create = useMutation({ mutationFn: createCategoria, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] }); closeModal(); } });
  const update = useMutation({
    mutationFn: ({ id, nombre, parent_id, es_padre, confirmReset }: { id: string; nombre: string; parent_id?: string; es_padre: boolean; confirmReset?: boolean }) => updateCategoria(id, { nombre, parent_id, es_padre, usuario_auditoria: "frontend", confirmar_limpieza_colision: confirmReset || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] }); setCollisionTarget(null); closeModal(); },
    onError: (error, variables) => {
      const { code, message } = parseApiError(error);
      if (code === "CATEGORY_ATTRIBUTE_COLLISION_REQUIRES_CONFIRMATION" && !variables.confirmReset) {
        setCollisionTarget({ ...variables, message: message ?? "El movimiento solapa atributos heredados y limpiará solo sus valores desplazados." });
        return;
      }
      toast({ variant: "destructive", title: "No se pudo mover la categoría", description: message ?? "Intenta nuevamente." });
    },
  });
  const [cascadeTarget, setCascadeTarget] = useState<{ categoria: Categoria; message: string } | null>(null);
  const remove = useMutation({
    mutationFn: ({ id, confirmCascade }: { id: string; confirmCascade: boolean }) => deleteCategoria(id, confirmCascade),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] });
      setCascadeTarget(null);
      if (variables.confirmCascade) {
        toast({ variant: "success", title: "Categoría y productos dados de baja" });
      }
    },
    onError: (error, variables) => {
      const { code, message } = parseApiError(error);
      if (code === "CATEGORY_PRODUCTS_REQUIRE_CONFIRMATION" && !variables.confirmCascade) {
        const categoria = data.find((item) => item.id === variables.id);
        if (categoria) setCascadeTarget({ categoria, message: message ?? "Los productos sin stock también se darán de baja." });
        return;
      }
      const messages: Record<string, string> = {
        CATEGORY_HAS_ACTIVE_CHILDREN: "Primero debes dar de baja las subcategorías activas.",
        CATEGORY_PRODUCTS_HAVE_STOCK: "No se puede dar de baja: uno o más productos tienen stock positivo.",
      };
      toast({
        variant: "destructive",
        title: "No se pudo dar de baja la categoría",
        description: (code && messages[code]) || message || "Intenta nuevamente.",
      });
    },
  });
  const [open, setOpen] = useState(false);
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [parentId, setParentId] = useState("");
  const [search, setSearch] = useState("");
  const filtered = data.filter((item) => item.nombre.toLowerCase().includes(search.toLowerCase()));
  const closeModal = () => { setOpen(false); setEditing(null); setNombre(""); setParentId(""); };
  const openEdit = (category: Categoria) => { setEditing(category); setNombre(category.nombre); setParentId(category.parent_id || ""); setOpen(true); };
  const saveCategory = () => {
    if (!editing) {
      create.mutate({ nombre, es_padre: !parentId, parent_id: parentId || undefined, usuario_auditoria: "frontend" });
      return;
    }
    if ((editing.parent_id ?? "") !== parentId) {
      setMoveConfirmOpen(true);
      return;
    }
    update.mutate({ id: editing.id, nombre, parent_id: parentId || undefined, es_padre: !parentId });
  };
  const columns: Column<Categoria>[] = [
    { key: "nombre", header: "Categoría", cell: (row) => row.nombre, sortable: true, sortAccessor: (row) => row.nombre },
    { key: "tipo", header: "Tipo", cell: (row) => row.is_default ? "Sin clasificar · temporal" : row.es_padre ? "Principal" : "Subcategoría" },
    { key: "padre", header: "Categoría padre", cell: (row) => data.find((parent) => parent.id === row.parent_id)?.nombre || "—" },
    { key: "acciones", header: "Acciones", cell: (row) => <div className="flex gap-1">{!row.is_default && <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>}<Button size="icon" variant="ghost" title="Dar de baja" className="text-destructive" onClick={() => remove.mutate({ id: row.id, confirmCascade: false })}><Trash2 className="h-4 w-4" /></Button></div> },
  ];
  return (
    <div>
      <PageHeader title="Categorías" description="Jerarquía de categorías del sistema integrado" actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nueva categoría</Button>} />
      <div className="mb-4 max-w-sm"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar categoría" /></div>
      <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay categorías" emptyDescription="Las categorías registradas aparecerán aquí." />
      <DetailModal open={open} onClose={closeModal} title={editing ? "Editar categoría" : "Nueva categoría"} footer={<div className="flex gap-2"><Button variant="outline" onClick={closeModal}>Cancelar</Button><Button onClick={saveCategory} disabled={create.isPending || update.isPending || !nombre.trim()}>{create.isPending || update.isPending ? "Guardando..." : "Guardar"}</Button></div>}>
        <div className="space-y-4"><FormField label="Nombre" required><Input value={nombre} onChange={(event) => setNombre(event.target.value)} /></FormField><FormField label="Categoría padre"><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">Sin padre, categoría principal</option>{data.filter((item) => item.id !== editing?.id && item.es_padre && !item.is_default).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField></div>
      </DetailModal>
      <ConfirmDialog
        open={Boolean(cascadeTarget)}
        onClose={() => setCascadeTarget(null)}
        title={`Dar de baja ${cascadeTarget?.categoria.nombre ?? "categoría"} y productos`}
        description={cascadeTarget?.message}
        confirmLabel="Dar de baja todos"
        variant="danger"
        onConfirm={() => cascadeTarget ? remove.mutateAsync({ id: cascadeTarget.categoria.id, confirmCascade: true }) : undefined}
      />
      <ConfirmDialog
        open={moveConfirmOpen}
        onClose={() => setMoveConfirmOpen(false)}
        title="Cambiar categoría padre"
        description="El cambio modifica la rama heredada de atributos y la estructura de navegación. Confirma que la nueva ubicación es correcta."
        confirmLabel="Mover categoría"
        onConfirm={() => {
          if (editing) update.mutate({ id: editing.id, nombre, parent_id: parentId || undefined, es_padre: !parentId });
          setMoveConfirmOpen(false);
        }}
      />
      <ConfirmDialog
        open={Boolean(collisionTarget)}
        onClose={() => setCollisionTarget(null)}
        title="Limpiar valores de atributos en conflicto"
        description={collisionTarget?.message}
        confirmLabel="Mover y limpiar"
        variant="danger"
        onConfirm={async () => {
          if (collisionTarget) await update.mutateAsync({ ...collisionTarget, confirmReset: true });
        }}
      />
    </div>
  );
}
