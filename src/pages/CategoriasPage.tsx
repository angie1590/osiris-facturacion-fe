import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ListChecks,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TreeSelector } from "@/components/shared/TreeSelector";
import { useCatalogs } from "@/features/catalog/catalogHooks";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/api-error";
import {
  createCategoria,
  deleteCategoria,
  getCategoriasCanonicas,
  updateCategoria,
  type Categoria,
} from "@/features/categorias/api";
import {
  getAtributosAplicables,
  type AtributoAplicable,
  type CategoriaAtributo,
} from "@/features/categorias/atributos-herencia";
import api from "@/lib/api";

interface AtributoOption {
  id: string;
  nombre: string;
  tipo_dato: string;
  allow_negative?: boolean;
  min_value?: string | null;
  max_value?: string | null;
  select_options?: string[] | null;
  catalog_id?: string | null;
}

interface AtributoPreview {
  valores_activos: number;
  asignaciones_activas: number;
  productos_afectados: number;
  convertibles: number;
  incompatibles: { producto_id: string; valor: unknown; motivo: string }[];
  remapeos_pendientes: number;
}

interface AtributoDefinition {
  nombre: string;
  tipo_dato: string;
  select_options?: string[];
  catalog_id?: string;
  allow_negative?: boolean;
  min_value?: number;
  max_value?: number;
  usuario_auditoria: string;
}

interface AssignmentUpdate {
  id: string;
  obligatorio: boolean;
  valor_default?: string;
  aplicar_default_a_existentes: boolean;
}

function CategoryNode({
  category,
  categories,
  assignmentCounts,
  assignmentCount,
  selectedCategoryId,
  searching,
  onSelect,
  onEdit,
  onCreateChild,
  onDelete,
}: {
  category: Categoria;
  categories: Categoria[];
  assignmentCounts: Map<string, number>;
  assignmentCount: number;
  selectedCategoryId: string | null;
  searching: boolean;
  onSelect: (category: Categoria) => void;
  onEdit: (category: Categoria) => void;
  onCreateChild: (category: Categoria) => void;
  onDelete: (category: Categoria) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = searching
    ? []
    : categories.filter((item) => item.parent_id === category.id);

  return (
    <div>
      <div
        className={`group flex min-h-11 items-center gap-2 px-3 py-2 hover:bg-muted ${selectedCategoryId === category.id ? "bg-muted" : ""}`}
      >
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center"
          aria-label={
            children.length
              ? `${expanded ? "Contraer" : "Expandir"} ${category.nombre}`
              : undefined
          }
          disabled={!children.length}
          onClick={() => setExpanded((current) => !current)}
        >
          {children.length ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : null}
        </button>
        <Tags className="h-4 w-4 shrink-0 text-muted-foreground" />
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-sm"
          onClick={() => onSelect(category)}
        >
          {category.nombre}
        </button>
        <Badge variant="secondary" title="Atributos propios y heredados">
          {assignmentCount}
        </Badge>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onSelect(category)}
          title="Atributos"
        >
          <Tags className="h-3.5 w-3.5" />
        </Button>
        {!category.is_default && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onEdit(category)}
            title="Editar categoría"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {!category.is_default && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onCreateChild(category)}
            title={`Crear subcategoría en ${category.nombre}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(category)}
          title="Dar de baja categoría"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {expanded &&
        children.map((child) => (
          <div key={child.id} className="pl-5">
            <CategoryNode
              category={child}
              categories={categories}
              assignmentCounts={assignmentCounts}
              assignmentCount={assignmentCounts.get(child.id) ?? 0}
              selectedCategoryId={selectedCategoryId}
              searching={searching}
              onSelect={onSelect}
              onEdit={onEdit}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
            />
          </div>
        ))}
    </div>
  );
}

export default function CategoriasPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    data: unsortedCategories = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["categorias-canonicas"],
    queryFn: getCategoriasCanonicas,
  });
  const data = [...unsortedCategories].sort((first, second) =>
    first.nombre.localeCompare(second.nombre, "es", { sensitivity: "base" }),
  );
  const attributes = useQuery({
    queryKey: ["atributos-canonicos"],
    queryFn: async () =>
      (
        await api.get<{ items: AtributoOption[] }>("/atributos", {
          params: { limit: 1000, offset: 0, only_active: true },
        })
      ).data.items,
  });
  const assignments = useQuery({
    queryKey: ["categorias-atributos"],
    queryFn: async () => {
      const items: CategoriaAtributo[] = [];
      for (let skip = 0; ; skip += 200) {
        const page = (
          await api.get<CategoriaAtributo[]>("/categorias-atributos", {
            params: { skip, limit: 200 },
          })
        ).data;
        items.push(...page);
        if (page.length < 200) return items;
      }
    },
  });
  const { data: catalogs = [] } = useCatalogs();
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [collisionTarget, setCollisionTarget] = useState<{
    id: string;
    nombre: string;
    parent_id?: string;
    es_padre: boolean;
    message: string;
  } | null>(null);
  const create = useMutation({
    mutationFn: createCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] });
      closeModal();
    },
    onError: (error) => {
      const { message } = parseApiError(error);
      toast({
        variant: "destructive",
        title: "No se pudo crear la categoría",
        description: message ?? "Intenta nuevamente.",
      });
    },
  });
  const update = useMutation({
    mutationFn: ({
      id,
      nombre,
      parent_id,
      es_padre,
      confirmReset,
    }: {
      id: string;
      nombre: string;
      parent_id?: string;
      es_padre: boolean;
      confirmReset?: boolean;
    }) =>
      updateCategoria(id, {
        nombre,
        parent_id,
        es_padre,
        usuario_auditoria: "frontend",
        confirmar_limpieza_colision: confirmReset || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] });
      setCollisionTarget(null);
      closeModal();
    },
    onError: (error, variables) => {
      const { code, message } = parseApiError(error);
      if (
        code === "CATEGORY_ATTRIBUTE_COLLISION_REQUIRES_CONFIRMATION" &&
        !variables.confirmReset
      ) {
        setCollisionTarget({
          ...variables,
          message:
            message ??
            "El movimiento solapa atributos heredados y limpiará solo sus valores desplazados.",
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "No se pudo mover la categoría",
        description: message ?? "Intenta nuevamente.",
      });
    },
  });
  const [cascadeTarget, setCascadeTarget] = useState<{
    categoria: Categoria;
    message: string;
  } | null>(null);
  const [attributeToDeactivate, setAttributeToDeactivate] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [openAttributeMenuId, setOpenAttributeMenuId] = useState<string | null>(
    null,
  );
  const remove = useMutation({
    mutationFn: ({
      id,
      confirmCascade,
    }: {
      id: string;
      confirmCascade: boolean;
    }) => deleteCategoria(id, confirmCascade),
    onSuccess: (_result, variables) => {
      if (selectedCategory?.id === variables.id) {
        const deletedCategory = data.find((item) => item.id === variables.id);
        const parent = deletedCategory?.parent_id
          ? data.find(
              (item) => item.id === deletedCategory.parent_id && item.activo,
            )
          : undefined;
        const nextActiveCategory =
          parent ??
          data.find((item) => item.id !== variables.id && item.activo);
        setSelectedCategory(nextActiveCategory ?? null);
      }
      queryClient.invalidateQueries({ queryKey: ["categorias-canonicas"] });
      queryClient.invalidateQueries({ queryKey: ["categorias-atributos"] });
      setCascadeTarget(null);
      if (variables.confirmCascade) {
        toast({
          variant: "success",
          title: "Categoría y productos dados de baja",
        });
      }
    },
    onError: (error, variables) => {
      const { code, message } = parseApiError(error);
      if (
        code === "CATEGORY_PRODUCTS_REQUIRE_CONFIRMATION" &&
        !variables.confirmCascade
      ) {
        const categoria = data.find((item) => item.id === variables.id);
        if (categoria)
          setCascadeTarget({
            categoria,
            message:
              message ?? "Los productos sin stock también se darán de baja.",
          });
        return;
      }
      const messages: Record<string, string> = {
        CATEGORY_HAS_ACTIVE_CHILDREN:
          "Primero debes dar de baja las subcategorías activas.",
        CATEGORY_PRODUCTS_HAVE_STOCK:
          "No se puede dar de baja: uno o más productos tienen stock positivo.",
      };
      toast({
        variant: "destructive",
        title: "No se pudo dar de baja la categoría",
        description:
          (code && messages[code]) || message || "Intenta nuevamente.",
      });
    },
  });
  const deactivateAttribute = useMutation({
    mutationFn: (id: string) => api.delete(`/atributos/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["atributos-canonicos"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["categorias-atributos"],
      });
      await queryClient.invalidateQueries({ queryKey: ["attribute-remap"] });
      setAttributeToDeactivate(null);
      toast({ variant: "success", title: "Atributo dado de baja" });
    },
  });
  const [assignmentToConfigure, setAssignmentToConfigure] =
    useState<AtributoAplicable | null>(null);
  const [assignmentRequired, setAssignmentRequired] = useState(false);
  const [assignmentDefault, setAssignmentDefault] = useState("");
  const [applyDefaultToExisting, setApplyDefaultToExisting] = useState(false);
  const [assignmentFormError, setAssignmentFormError] = useState("");
  const [backfillConfirmOpen, setBackfillConfirmOpen] = useState(false);
  const updateAssignment = useMutation({
    mutationFn: async (input: AssignmentUpdate) =>
      (
        await api.put(`/categorias-atributos/${input.id}`, {
          obligatorio: input.obligatorio,
          valor_default: input.valor_default,
          aplicar_default_a_existentes: input.aplicar_default_a_existentes,
          usuario_auditoria: "frontend",
        })
      ).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["categorias-atributos"],
      });
      setAssignmentToConfigure(null);
      setAssignmentFormError("");
      setBackfillConfirmOpen(false);
      toast({
        variant: "success",
        title: "Configuración del atributo actualizada",
      });
    },
    onError: (error) => {
      const { message } = parseApiError(error);
      setAssignmentFormError(
        message ?? "No se pudo actualizar la configuración del atributo.",
      );
    },
  });
  const [open, setOpen] = useState(false);
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [parentId, setParentId] = useState("");
  const [search, setSearch] = useState("");
  const filtered = data.filter((item) =>
    item.nombre.toLowerCase().includes(search.toLowerCase()),
  );
  const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(
    null,
  );
  const [newAttributeOpen, setNewAttributeOpen] = useState(false);
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(
    null,
  );
  const [attributePreview, setAttributePreview] =
    useState<AtributoPreview | null>(null);
  const [attributeFormError, setAttributeFormError] = useState("");
  const [attributeName, setAttributeName] = useState("");
  const [attributeType, setAttributeType] = useState("string");
  const [attributeOptions, setAttributeOptions] = useState("");
  const [attributeCatalogId, setAttributeCatalogId] = useState("");
  const [attributeRequired, setAttributeRequired] = useState(false);
  const [attributeDefault, setAttributeDefault] = useState("");
  const [allowNegative, setAllowNegative] = useState(false);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const buildAttributeDefinition = (): AtributoDefinition => {
    const options = attributeOptions
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return {
      nombre: attributeName.trim(),
      tipo_dato: attributeType,
      select_options: attributeType === "select" ? options : undefined,
      catalog_id:
        attributeType === "catalog"
          ? attributeCatalogId || undefined
          : undefined,
      allow_negative:
        ["integer", "decimal"].includes(attributeType) && allowNegative,
      min_value: minValue ? Number(minValue) : undefined,
      max_value: maxValue ? Number(maxValue) : undefined,
      usuario_auditoria: "frontend",
    };
  };
  const assignmentCounts = new Map(
    data.map((category) => [
      category.id,
      getAtributosAplicables(category, data, assignments.data ?? []).length,
    ]),
  );
  const categoryAssignments = selectedCategory
    ? getAtributosAplicables(
        selectedCategory,
        data,
        assignments.data ?? [],
      ).sort((first, second) =>
        (
          attributes.data?.find(
            (attribute) => attribute.id === first.atributo_id,
          )?.nombre ?? ""
        ).localeCompare(
          attributes.data?.find(
            (attribute) => attribute.id === second.atributo_id,
          )?.nombre ?? "",
          "es",
          { sensitivity: "base" },
        ),
      )
    : [];
  const roots = search.trim()
    ? filtered
    : data.filter((item) => !item.parent_id);
  const excludedParentIds = new Set<string>();
  if (editing) {
    const pendingIds = [editing.id];
    while (pendingIds.length) {
      const categoryId = pendingIds.pop()!;
      if (excludedParentIds.has(categoryId)) continue;
      excludedParentIds.add(categoryId);
      pendingIds.push(
        ...data
          .filter((category) => category.parent_id === categoryId)
          .map((category) => category.id),
      );
    }
  }
  const parentOptions = data.filter(
    (category) =>
      category.activo &&
      !category.is_default &&
      !excludedParentIds.has(category.id),
  );
  const createAttribute = useMutation({
    mutationFn: async () => {
      if (
        attributeType === "select" &&
        !buildAttributeDefinition().select_options?.length
      ) {
        throw new Error("Un atributo select requiere al menos una opción.");
      }
      return (
        await api.post("/atributos", {
          categoria_id: selectedCategory!.id,
          ...buildAttributeDefinition(),
          obligatorio: attributeRequired,
          valor_default: attributeDefault || undefined,
        })
      ).data;
    },
    onError: (error) => {
      const { message } = parseApiError(error);
      toast({
        variant: "destructive",
        title: "No se pudo crear el atributo",
        description:
          message ?? "Comprueba que el nombre no esté usado en otra categoría.",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atributos-canonicos"] });
      queryClient.invalidateQueries({ queryKey: ["categorias-atributos"] });
      setNewAttributeOpen(false);
      setAttributeName("");
      setAttributeOptions("");
      setAttributeCatalogId("");
      setAttributeRequired(false);
      setAttributeDefault("");
      setAllowNegative(false);
      setMinValue("");
      setMaxValue("");
      toast({ variant: "success", title: "Atributo creado y asignado" });
    },
  });
  const previewAttribute = useMutation({
    mutationFn: async ({
      id,
      definition,
    }: {
      id: string;
      definition: AtributoDefinition;
    }) =>
      (
        await api.post<AtributoPreview>(
          `/atributos/${id}/previsualizar`,
          definition,
        )
      ).data,
    onSuccess: (preview) => {
      setAttributePreview(preview);
      setAttributeFormError("");
    },
    onError: (error) => {
      const { message } = parseApiError(error);
      setAttributeFormError(message ?? "No se pudo previsualizar la edición.");
    },
  });
  const editAttribute = useMutation({
    mutationFn: async ({
      id,
      definition,
    }: {
      id: string;
      definition: AtributoDefinition;
    }) => (await api.put(`/atributos/${id}`, definition)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["atributos-canonicos"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["categorias-atributos"],
      });
      await queryClient.invalidateQueries({ queryKey: ["attribute-remap"] });
      setAttributePreview(null);
      setNewAttributeOpen(false);
      setEditingAttributeId(null);
      setAttributeFormError("");
      toast({ variant: "success", title: "Atributo actualizado" });
    },
    onError: (error) => {
      const { message } = parseApiError(error);
      setAttributeFormError(message ?? "No se pudo guardar la edición.");
    },
  });
  const openEditAttribute = (attributeId: string) => {
    const attribute = attributes.data?.find((item) => item.id === attributeId);
    if (!attribute) return;
    setEditingAttributeId(attribute.id);
    setAttributeName(attribute.nombre);
    setAttributeType(attribute.tipo_dato);
    setAttributeOptions(attribute.select_options?.join(", ") ?? "");
    setAttributeCatalogId(attribute.catalog_id ?? "");
    setAllowNegative(attribute.allow_negative ?? false);
    setMinValue(attribute.min_value ?? "");
    setMaxValue(attribute.max_value ?? "");
    setAttributeFormError("");
    setAttributePreview(null);
    setOpenAttributeMenuId(null);
    setNewAttributeOpen(true);
  };
  const submitAttributeEdit = () => {
    if (!editingAttributeId) return;
    const definition = buildAttributeDefinition();
    if (!definition.nombre) {
      setAttributeFormError("El nombre es obligatorio.");
      return;
    }
    if (
      attributeType === "select" &&
      (!definition.select_options?.length ||
        new Set(
          definition.select_options.map((option) => option.toLocaleLowerCase()),
        ).size !== definition.select_options.length)
    ) {
      setAttributeFormError("Las opciones deben existir y ser únicas.");
      return;
    }
    previewAttribute.mutate({ id: editingAttributeId, definition });
  };
  const openConfigureAssignment = (assignment: AtributoAplicable) => {
    setAssignmentToConfigure(assignment);
    setAssignmentRequired(assignment.obligatorio ?? false);
    setAssignmentDefault(assignment.valor_default ?? "");
    setApplyDefaultToExisting(false);
    setAssignmentFormError("");
    setBackfillConfirmOpen(false);
    setOpenAttributeMenuId(null);
  };
  const saveAssignmentConfiguration = () => {
    if (!assignmentToConfigure) return;
    updateAssignment.mutate({
      id: assignmentToConfigure.id,
      obligatorio: assignmentRequired,
      valor_default: assignmentRequired ? assignmentDefault.trim() : undefined,
      aplicar_default_a_existentes:
        assignmentRequired && applyDefaultToExisting,
    });
  };
  const submitAssignmentConfiguration = () => {
    if (!assignmentToConfigure) return;
    if (assignmentRequired && !assignmentDefault.trim()) {
      setAssignmentFormError(
        "Ingresa un valor por defecto para hacer obligatorio este atributo.",
      );
      return;
    }
    if (assignmentRequired && applyDefaultToExisting) {
      setBackfillConfirmOpen(true);
      return;
    }
    saveAssignmentConfiguration();
  };
  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    setNombre("");
    setParentId("");
  };
  const openEdit = (category: Categoria) => {
    setEditing(category);
    setNombre(category.nombre);
    setParentId(category.parent_id || "");
    setOpen(true);
  };
  const saveCategory = () => {
    if (!editing) {
      create.mutate({
        nombre,
        es_padre: !parentId,
        parent_id: parentId || undefined,
        usuario_auditoria: "frontend",
      });
      return;
    }
    if ((editing.parent_id ?? "") !== parentId) {
      setMoveConfirmOpen(true);
      return;
    }
    update.mutate({
      id: editing.id,
      nombre,
      parent_id: parentId || undefined,
      es_padre: !parentId,
    });
  };
  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Organiza categorías y sus atributos"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setNombre("");
              setParentId("");
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva categoría
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b p-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar categoría"
            />
          </div>
          {isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Cargando categorías...
            </p>
          ) : isError ? (
            <div className="p-6 text-center">
              <p className="mb-3 text-sm text-destructive">
                No se pudieron cargar las categorías.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : roots.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {search ? "No hay coincidencias." : "No hay categorías todavía."}
            </p>
          ) : (
            roots.map((category) => (
              <CategoryNode
                key={category.id}
                category={category}
                categories={data}
                assignmentCounts={assignmentCounts}
                assignmentCount={assignmentCounts.get(category.id) ?? 0}
                selectedCategoryId={selectedCategory?.id ?? null}
                searching={Boolean(search.trim())}
                onSelect={setSelectedCategory}
                onEdit={openEdit}
                onCreateChild={(category) => {
                  setEditing(null);
                  setNombre("");
                  setParentId(category.id);
                  setOpen(true);
                }}
                onDelete={(item) =>
                  remove.mutate({ id: item.id, confirmCascade: false })
                }
              />
            ))
          )}
        </section>
        <section className="min-h-64 rounded-lg border bg-card p-4">
          {selectedCategory ? (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedCategory.nombre}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Atributos propios y heredados
                  </p>
                </div>
                <Button onClick={() => setNewAttributeOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo atributo
                </Button>
              </div>
              {assignments.isLoading || attributes.isLoading ? (
                <p className="py-5 text-sm text-muted-foreground">
                  Cargando atributos...
                </p>
              ) : categoryAssignments.length ? (
                <div className="divide-y border-y">
                  {categoryAssignments.map((assignment) => {
                    const attribute = attributes.data?.find(
                      (item) => item.id === assignment.atributo_id,
                    );
                    const inherited = assignment.profundidad > 0;
                    const sourceCategory = data.find(
                      (item) => item.id === assignment.categoria_origen_id,
                    );
                    return (
                      <div
                        key={assignment.id}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(68px,auto)_minmax(78px,auto)_36px] items-center gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_72px_88px_minmax(112px,128px)_36px] sm:gap-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {attribute?.nombre ?? "Atributo inactivo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {attribute?.tipo_dato ?? ""}
                          </p>
                        </div>
                        <Badge
                          variant={inherited ? "secondary" : "default"}
                          title={
                            inherited
                              ? `Heredado de ${sourceCategory?.nombre ?? "categoría superior"}`
                              : "Asignado directamente"
                          }
                        >
                          {inherited ? "Heredado" : "Propio"}
                        </Badge>
                        <Badge
                          variant={
                            assignment.obligatorio ? "default" : "secondary"
                          }
                        >
                          {assignment.obligatorio ? "Obligatorio" : "Opcional"}
                        </Badge>
                        <span className="hidden max-w-32 truncate text-xs text-muted-foreground sm:block">
                          {assignment.valor_default || "Sin valor por defecto"}
                        </span>
                        <div
                          className="relative justify-self-end"
                          onBlur={(event) => {
                            if (
                              !event.currentTarget.contains(event.relatedTarget)
                            )
                              setOpenAttributeMenuId(null);
                          }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Acciones de ${attribute?.nombre ?? "atributo"}`}
                            aria-expanded={
                              openAttributeMenuId === assignment.id
                            }
                            aria-haspopup="menu"
                            onClick={() =>
                              setOpenAttributeMenuId((current) =>
                                current === assignment.id
                                  ? null
                                  : assignment.id,
                              )
                            }
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${openAttributeMenuId === assignment.id ? "rotate-180" : ""}`}
                            />
                          </Button>
                          {openAttributeMenuId === assignment.id && (
                            <div
                              className="absolute right-0 z-20 mt-1 min-w-36 rounded-md border bg-popover p-1 shadow-md"
                              role="menu"
                              aria-label={`Acciones de ${attribute?.nombre ?? "atributo"}`}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                                disabled={!attribute}
                                onClick={() =>
                                  openEditAttribute(assignment.atributo_id)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() =>
                                  openConfigureAssignment(assignment)
                                }
                              >
                                <ListChecks className="h-4 w-4" />
                                Configurar categoría
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                                onClick={() => {
                                  setOpenAttributeMenuId(null);
                                  setAttributeToDeactivate({
                                    id: assignment.atributo_id,
                                    nombre: attribute?.nombre ?? "Atributo",
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="border-y py-6 text-center text-sm text-muted-foreground">
                  Esta categoría y sus categorías superiores no tienen atributos
                  asignados.
                </p>
              )}
            </>
          ) : (
            <div className="flex min-h-56 items-center justify-center text-center text-sm text-muted-foreground">
              Selecciona una categoría para revisar sus atributos.
            </div>
          )}
        </section>
      </div>
      <DetailModal
        open={open}
        onClose={closeModal}
        title={editing ? "Editar categoría" : "Nueva categoría"}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              onClick={saveCategory}
              disabled={create.isPending || update.isPending || !nombre.trim()}
            >
              {create.isPending || update.isPending
                ? "Guardando..."
                : "Guardar"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre" required>
            <Input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
            />
          </FormField>
          <FormField label="Categoría padre">
            <TreeSelector
              categories={parentOptions.map((category) => ({
                id: category.id,
                name: category.nombre,
                parent_id: category.parent_id,
                is_active: category.activo,
              }))}
              value={parentId || null}
              onChange={(categoryId) => setParentId(categoryId ?? "")}
              allowRootOption
              rootLabel="Sin padre, categoría principal"
              placeholder="Sin padre, categoría principal"
            />
          </FormField>
          {!editing &&
            parentId &&
            !data.find((category) => category.id === parentId)?.es_padre && (
              <p className="text-sm text-muted-foreground">
                Si esta categoría contiene productos, pasarán a una subcategoría
                temporal “Sin clasificar” para su posterior recategorización.
              </p>
            )}
        </div>
      </DetailModal>
      <DetailModal
        open={newAttributeOpen}
        onClose={() => {
          setNewAttributeOpen(false);
          setEditingAttributeId(null);
          setAttributeFormError("");
        }}
        title={
          editingAttributeId
            ? "Editar atributo"
            : `Nuevo atributo · ${selectedCategory?.nombre ?? "Categoría"}`
        }
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewAttributeOpen(false);
                setEditingAttributeId(null);
                setAttributeFormError("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editingAttributeId
                  ? submitAttributeEdit()
                  : createAttribute.mutate()
              }
              disabled={
                createAttribute.isPending ||
                previewAttribute.isPending ||
                editAttribute.isPending ||
                !attributeName.trim() ||
                (attributeType === "select" && !attributeOptions.trim())
              }
            >
              {editingAttributeId
                ? previewAttribute.isPending
                  ? "Calculando..."
                  : "Previsualizar cambios"
                : createAttribute.isPending
                  ? "Guardando..."
                  : "Crear y asignar"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {attributeFormError && (
            <p role="alert" className="text-sm text-destructive">
              {attributeFormError}
            </p>
          )}
          <FormField label="Nombre" required>
            <Input
              value={attributeName}
              onChange={(event) => setAttributeName(event.target.value)}
            />
          </FormField>
          <FormField label="Tipo de dato" required>
            <select
              className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
              value={attributeType}
              onChange={(event) => setAttributeType(event.target.value)}
            >
              {[
                "string",
                "integer",
                "decimal",
                "boolean",
                "date",
                "select",
                "catalog",
              ].map((type) => (
                <option key={type} value={type}>
                  {type === "string" ? "Texto" : type}
                </option>
              ))}
            </select>
          </FormField>
          {attributeType === "select" && (
            <FormField label="Opciones separadas por coma" required>
              <Input
                value={attributeOptions}
                onChange={(event) => setAttributeOptions(event.target.value)}
              />
            </FormField>
          )}
          {attributeType === "catalog" && (
            <FormField label="Catálogo">
              <select
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                value={attributeCatalogId}
                onChange={(event) => setAttributeCatalogId(event.target.value)}
              >
                <option value="">Crear catálogo automáticamente</option>
                {catalogs
                  .filter((catalog) => catalog.is_active)
                  .map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
              </select>
            </FormField>
          )}
          {["integer", "decimal"].includes(attributeType) && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowNegative}
                  onChange={(event) => setAllowNegative(event.target.checked)}
                />{" "}
                Permitir valores negativos
              </label>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Mínimo">
                  <Input
                    type="number"
                    value={minValue}
                    onChange={(event) => setMinValue(event.target.value)}
                  />
                </FormField>
                <FormField label="Máximo">
                  <Input
                    type="number"
                    value={maxValue}
                    onChange={(event) => setMaxValue(event.target.value)}
                  />
                </FormField>
              </div>
            </>
          )}
          {!editingAttributeId && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={attributeRequired}
                onChange={(event) => setAttributeRequired(event.target.checked)}
              />{" "}
              Obligatorio en esta categoría
            </label>
          )}
          {!editingAttributeId && attributeRequired && (
            <FormField label="Valor por defecto">
              <Input
                value={attributeDefault}
                onChange={(event) => setAttributeDefault(event.target.value)}
              />
            </FormField>
          )}
        </div>
      </DetailModal>
      <ConfirmDialog
        open={Boolean(attributePreview)}
        onClose={() => setAttributePreview(null)}
        title="Previsualización del cambio"
        description={
          attributePreview && (
            <div className="space-y-2">
              <p>
                {attributePreview.asignaciones_activas} asignaciones activas en{" "}
                {attributePreview.productos_afectados} productos.{" "}
                {attributePreview.valores_activos} valores:{" "}
                {attributePreview.convertibles} convertibles y{" "}
                {attributePreview.incompatibles.length} incompatibles.
              </p>
              {attributePreview.remapeos_pendientes > 0 && (
                <p className="text-destructive">
                  Hay remapeos pendientes; resuélvelos antes de cambiar la
                  definición.
                </p>
              )}
              {attributePreview.incompatibles.length > 0 && (
                <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
                  {attributePreview.incompatibles.slice(0, 8).map((item) => (
                    <li key={item.producto_id}>
                      {String(item.valor)}: {item.motivo}
                    </li>
                  ))}
                </ul>
              )}
              <p>Los valores incompatibles se conservarán para remapeo.</p>
            </div>
          )
        }
        confirmLabel="Aplicar cambios"
        confirmDisabled={
          Boolean(attributePreview?.remapeos_pendientes) ||
          editAttribute.isPending
        }
        onConfirm={async () => {
          if (editingAttributeId)
            await editAttribute.mutateAsync({
              id: editingAttributeId,
              definition: buildAttributeDefinition(),
            });
        }}
      />
      <DetailModal
        open={Boolean(assignmentToConfigure)}
        onClose={() => {
          setAssignmentToConfigure(null);
          setAssignmentFormError("");
        }}
        title={`Configurar atributo ${attributes.data?.find((attribute) => attribute.id === assignmentToConfigure?.atributo_id)?.nombre ?? ""} en categoría ${data.find((category) => category.id === assignmentToConfigure?.categoria_origen_id)?.nombre ?? ""}`}
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAssignmentToConfigure(null);
                setAssignmentFormError("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitAssignmentConfiguration}
              disabled={updateAssignment.isPending}
            >
              {updateAssignment.isPending
                ? "Guardando..."
                : "Guardar configuración"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {assignmentFormError && (
            <p role="alert" className="text-sm text-destructive">
              {assignmentFormError}
            </p>
          )}
          {assignmentToConfigure?.profundidad ? (
            <p className="text-sm text-muted-foreground">
              Esta asignación se hereda de{" "}
              {data.find(
                (item) => item.id === assignmentToConfigure.categoria_origen_id,
              )?.nombre ?? "una categoría superior"}
              ; los cambios aplicarán a esa categoría y sus descendientes.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={assignmentRequired}
              onChange={(event) => setAssignmentRequired(event.target.checked)}
            />
            Obligatorio en esta categoría
          </label>
          {assignmentRequired && (
            <>
              <FormField label="Valor por defecto" required>
                <Input
                  type={
                    attributes.data?.find(
                      (item) => item.id === assignmentToConfigure?.atributo_id,
                    )?.tipo_dato === "integer" ||
                    attributes.data?.find(
                      (item) => item.id === assignmentToConfigure?.atributo_id,
                    )?.tipo_dato === "decimal"
                      ? "number"
                      : "text"
                  }
                  step={
                    attributes.data?.find(
                      (item) => item.id === assignmentToConfigure?.atributo_id,
                    )?.tipo_dato === "decimal"
                      ? "any"
                      : undefined
                  }
                  value={assignmentDefault}
                  onChange={(event) => setAssignmentDefault(event.target.value)}
                />
              </FormField>
              <label className="flex items-start gap-2 text-sm">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={applyDefaultToExisting}
                  onChange={(event) =>
                    setApplyDefaultToExisting(event.target.checked)
                  }
                />
                <span>
                  Aplicar el valor por defecto a los productos existentes que no
                  tengan valor
                </span>
              </label>
              <p className="text-xs text-muted-foreground">
                Los valores existentes se conservarán; el valor solo se agregará
                a productos sin valor definido.
              </p>
            </>
          )}
        </div>
      </DetailModal>
      <ConfirmDialog
        open={backfillConfirmOpen}
        onClose={() => setBackfillConfirmOpen(false)}
        title="Completar valores faltantes"
        description={`Se asignará “${assignmentDefault.trim()}” únicamente a los productos existentes sin valor para este atributo${assignmentToConfigure?.profundidad ? ` en ${data.find((item) => item.id === assignmentToConfigure.categoria_origen_id)?.nombre ?? "la categoría de origen"} y sus descendientes` : ` de ${data.find((item) => item.id === assignmentToConfigure?.categoria_id)?.nombre ?? "esta categoría"}`}. Los valores actuales no se modificarán.`}
        confirmLabel="Aplicar a faltantes"
        confirmDisabled={updateAssignment.isPending}
        onConfirm={async () => saveAssignmentConfiguration()}
      />
      <ConfirmDialog
        open={Boolean(attributeToDeactivate)}
        onClose={() => setAttributeToDeactivate(null)}
        title={`Dar de baja ${attributeToDeactivate?.nombre ?? "atributo"}`}
        description="La baja es global: desactivará este atributo, sus asignaciones en todas las categorías y sus valores EAV activos. Los datos se conservarán y la acción podrá revertirse si no hay cambios posteriores."
        confirmLabel="Dar de baja atributo"
        variant="danger"
        confirmDisabled={deactivateAttribute.isPending}
        onConfirm={async () => {
          if (attributeToDeactivate)
            await deactivateAttribute.mutateAsync(attributeToDeactivate.id);
        }}
      />
      <ConfirmDialog
        open={Boolean(cascadeTarget)}
        onClose={() => setCascadeTarget(null)}
        title={`Dar de baja ${cascadeTarget?.categoria.nombre ?? "categoría"} y productos`}
        description={cascadeTarget?.message}
        confirmLabel="Dar de baja todos"
        variant="danger"
        onConfirm={() =>
          cascadeTarget
            ? remove.mutateAsync({
                id: cascadeTarget.categoria.id,
                confirmCascade: true,
              })
            : undefined
        }
      />
      <ConfirmDialog
        open={moveConfirmOpen}
        onClose={() => setMoveConfirmOpen(false)}
        title="Cambiar categoría padre"
        description="El cambio modifica la rama heredada de atributos y la estructura de navegación. Confirma que la nueva ubicación es correcta."
        confirmLabel="Mover categoría"
        onConfirm={() => {
          if (editing)
            update.mutate({
              id: editing.id,
              nombre,
              parent_id: parentId || undefined,
              es_padre: !parentId,
            });
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
          if (collisionTarget)
            await update.mutateAsync({
              ...collisionTarget,
              confirmReset: true,
            });
        }}
      />
    </div>
  );
}
