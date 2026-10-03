import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  getCategoriasCanonicas,
  getProductosSinRecategorizar,
  recategorizarProductos,
  type Categoria,
} from "@/features/categorias/api";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";

function categoryPath(categoryId: string, categories: Categoria[]) {
  const path: string[] = [];
  const visited = new Set<string>();
  let current = categories.find((category) => category.id === categoryId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current.nombre);
    current = current.parent_id
      ? categories.find((category) => category.id === current?.parent_id)
      : undefined;
  }
  return path.join(" / ");
}

function isUnderParent(category: Categoria, parentId: string, categories: Categoria[]) {
  const visited = new Set<string>();
  let currentParentId = category.parent_id;
  while (currentParentId && !visited.has(currentParentId)) {
    if (currentParentId === parentId) return true;
    visited.add(currentParentId);
    currentParentId = categories.find((item) => item.id === currentParentId)?.parent_id ?? null;
  }
  return false;
}

export default function RecategorizePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: pending = [], isLoading, isError } = useQuery({
    queryKey: ["productos-sin-recategorizar"],
    queryFn: getProductosSinRecategorizar,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categorias-canonicas"],
    queryFn: getCategoriasCanonicas,
  });
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const recategorize = useMutation({
    mutationFn: recategorizarProductos,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["productos-sin-recategorizar"] });
      queryClient.invalidateQueries({ queryKey: ["recategorizacion-pendientes"] });
      queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] });
      toast({
        variant: "success",
        title: "Productos recategorizados",
        description: `${result.recategorized} producto(s) reasignado(s).`,
      });
      setAssignments({});
    },
  });

  const groups = useMemo(() => {
    const byDefault = new Map<string, typeof pending>();
    for (const product of pending) {
      const products = byDefault.get(product.categoria_id) ?? [];
      products.push(product);
      byDefault.set(product.categoria_id, products);
    }

    return Array.from(byDefault.entries()).map(([defaultId, products]) => {
      const bucket = categories.find((category) => category.id === defaultId);
      const parentId = bucket?.parent_id ?? products[0]?.padre_id ?? null;
      const targets = parentId
        ? categories.filter(
            (category) =>
              category.activo &&
              !category.es_padre &&
              !category.is_default &&
              isUnderParent(category, parentId, categories),
          )
        : [];
      return {
        defaultId,
        parentPath: parentId ? categoryPath(parentId, categories) : "—",
        products,
        targets,
      };
    });
  }, [categories, pending]);

  const selectedCount = Object.keys(assignments).length;

  const handleSubmit = async () => {
    const payload = Object.entries(assignments).map(([producto_id, categoria_id]) => ({
      producto_id,
      categoria_id,
    }));
    if (payload.length === 0) {
      toast({
        variant: "warning",
        title: "Nada que guardar",
        description: "Asigna una categoría a al menos un producto.",
      });
      return;
    }
    try {
      await recategorize.mutateAsync(payload);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error al recategorizar",
        description: getApiErrorMessage(error, "No se pudo recategorizar. Intenta nuevamente."),
      });
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) {
    return <EmptyState heading="No se pudieron cargar los productos" description="Intenta nuevamente." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recategorizar productos"
        actions={pending.length > 0 && (
          <Button
            onClick={handleSubmit}
            isLoading={recategorize.isPending}
            disabled={selectedCount === 0}
          >
            Guardar ({selectedCount})
          </Button>
        )}
      />

      {pending.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-10 w-10 text-success" />}
          heading="No hay productos pendientes"
          description="Todos los productos están asignados a una categoría definitiva."
          action={{ label: "Ir a productos", onClick: () => navigate("/productos") }}
        />
      ) : (
        <>
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/80 bg-amber-100/95 px-4 py-2.5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Estos productos están en una categoría temporal <strong>"Sin clasificar"</strong>.
              Asígnales una subcategoría definitiva.
            </span>
          </div>

          {groups.map((group) => (
            <section key={group.defaultId} className="overflow-hidden rounded-md border bg-card">
              <div className="border-b px-4 py-2 text-sm font-medium text-muted-foreground">
                {group.parentPath} <span className="text-foreground">/ Sin clasificar</span>
                {" · "}{group.products.length} producto(s)
              </div>
              <div className="divide-y">
                {group.products.map((product) => (
                  <div key={product.producto_id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Código de barras {product.codigo_barras || "—"}
                      </p>
                    </div>
                    <select
                      className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm sm:w-80"
                      value={assignments[product.producto_id] ?? ""}
                      onChange={(event) => setAssignments((previous) => {
                        const next = { ...previous };
                        if (event.target.value) next[product.producto_id] = event.target.value;
                        else delete next[product.producto_id];
                        return next;
                      })}
                    >
                      <option value="">Elegir subcategoría</option>
                      {group.targets.map((category) => (
                        <option key={category.id} value={category.id}>
                          {categoryPath(category.id, categories)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}