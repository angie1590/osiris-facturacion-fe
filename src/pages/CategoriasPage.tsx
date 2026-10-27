import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  History,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Tags,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/PageHeader";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TreeSelector } from "@/components/shared/TreeSelector";
import { useCatalogs } from "@/features/catalog/catalogHooks";
import { useAuth } from "@/contexts/AuthContext";
import { getEffectivePermissions } from "@/features/personas/directory";
import {
  catalogAccess,
  type CatalogAccessContext,
} from "@/features/categorias/catalog-access";
import { useToast } from "@/hooks/use-toast";
import { listarUnidades } from "@/features/unidades/api";
import { parseApiError } from "@/lib/api-error";
import {
  confirmCategoryCreate,
  confirmCategoryMove,
  createCategoria,
  deleteCategoria,
  assignExistingAttribute,
  getCategoriaAtributosEfectivos,
  getCategoriaAtributosPropios,
  getCategoriasArbol,
  previewRemoveCategoriaAtributo,
  removeCategoriaAtributo,
  previewCreateCategoryAttribute,
  previewCategoriaAtributo,
  previewCategoryCreate,
  previewCategoryMove,
  updateCategoria,
  type B3Preview,
  type CategoriaAtributoPreview,
  type CategoryAttributeCreatePayload,
  type CategoriaAtributoEfectivo,
  type Categoria,
  type CategoriaArbol,
  type CategoriaWrite,
} from "@/features/categorias/api";
import type { AtributoAplicable } from "@/features/categorias/atributos-herencia";
import api from "@/lib/api";

interface AtributoOption {
  id: string;
  nombre: string;
  codigo?: string;
  tipo_dato: string;
  activo?: boolean;
  actualizado_en?: string;
  unidad_id?: string | null;
  unidad?: {
    id: string;
    codigo: string;
    nombre: string;
    simbolo: string;
    magnitud_codigo: string;
  } | null;
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
  requiere_confirmacion?: boolean;
  resumen_anotacion_unidad?: string | null;
  precondicion_preview?: string;
  unidad_anotacion?: {
    unidad: { id: string; nombre: string; simbolo: string };
    conteos: {
      valores_activos: number;
      valores_inactivos: number;
      valores_historicos: number;
      defaults_actuales: number;
      defaults_historicos: number;
      productos_afectados: number;
    };
    requiere_confirmacion: boolean;
    precondicion_preview?: string;
  } | null;
}

interface AtributoDefinition {
  nombre: string;
  tipo_dato: string;
  unidad_id?: string | null;
  select_options?: string[];
  catalog_id?: string;
  allow_negative?: boolean;
  min_value?: number;
  max_value?: number;
}

interface AtributoPreviewDraft {
  id: string;
  definition: AtributoDefinition;
}

interface AssignmentUpdate {
  id: string;
  categoria_id: string;
  atributo_id: string;
  override: boolean;
  orden: number | null;
  obligatorio: boolean;
  valor_default: string | null;
  aplicar_default_a_existentes: boolean;
  precondicion_preview?: string;
}

interface B3ConfirmationDraft {
  operation: "create" | "move";
  payload: CategoriaWrite;
  categoryId?: string;
  preview: B3Preview;
}

function CategoryNode({
  category,
  assignmentCounts,
  assignmentCount,
  selectedCategoryId,
  searching,
  onSelect,
  onEdit,
  onCreateChild,
  onDelete,
  canUpdate,
  canDeactivate,
}: {
  category: CategoriaArbol;
  assignmentCounts: Map<string, number>;
  assignmentCount: number;
  selectedCategoryId: string | null;
  searching: boolean;
  onSelect: (category: Categoria) => void;
  onEdit: (category: Categoria) => void;
  onCreateChild: (category: Categoria) => void;
  onDelete: (category: Categoria) => void;
  canUpdate: boolean;
  canDeactivate: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = searching
    ? []
    : category.hijos;

  return (
    <div>
      <div
        className={`group flex min-h-11 flex-wrap items-center gap-2 px-3 py-2 hover:bg-muted sm:flex-nowrap ${selectedCategoryId === category.id ? "bg-muted" : ""}`}
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
          className="min-w-0 flex-1 break-words text-left text-sm sm:truncate"
          disabled={category.is_default}
          onClick={() => onSelect(category)}
        >
          {category.nombre}
        </button>
        {category.is_default && <Badge variant="outline">Temporal</Badge>}
        <Badge variant="secondary" title="Atributos propios y heredados">
          {assignmentCount}
        </Badge>
        <div className="ml-auto flex basis-full items-center justify-end gap-1 sm:ml-0 sm:basis-auto">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={category.is_default}
            onClick={() => onSelect(category)}
            title="Atributos"
          >
            <Tags className="h-3.5 w-3.5" />
          </Button>
          {!category.is_default && canUpdate && (
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
          {!category.is_default && canUpdate && (
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
          {!category.is_default && canDeactivate && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(category)}
              title="Dar de baja categoría"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {expanded &&
        children.map((child) => (
          <div key={child.id} className="pl-5">
            <CategoryNode
              category={child}
              assignmentCounts={assignmentCounts}
              assignmentCount={assignmentCounts.get(child.id) ?? 0}
              selectedCategoryId={selectedCategoryId}
              searching={searching}
              onSelect={onSelect}
              onEdit={onEdit}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
              canUpdate={canUpdate}
              canDeactivate={canDeactivate}
            />
          </div>
        ))}
    </div>
  );
}

export default function CategoriasPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const actor = user?.id == null ? null : String(user.id);
  const permissions = useQuery({
    queryKey: ["effective-permissions", actor],
    queryFn: () => getEffectivePermissions(actor!),
    enabled: actor !== null,
  });
  const accessContext: CatalogAccessContext = actor === null
    ? { actor: null, status: "pendiente" }
    : permissions.isPending
      ? { actor, status: "pendiente" }
      : permissions.isError
        ? { actor, status: "error" }
        : {
            actor,
            permissionsActor: actor,
            status: "listo",
            permissions: permissions.data ?? [],
          };
  const canReadCategories = catalogAccess(accessContext, "read_categories") === "permitido";
  const canReadCategoryAttributes = catalogAccess(accessContext, "read_category_attributes") === "permitido";
  const canAssignAttribute = catalogAccess(accessContext, "assign_attribute") === "permitido";
  const canCreateAndAssignAttribute = catalogAccess(accessContext, "create_and_assign_attribute") === "permitido";
  const canEditGlobalAttribute = catalogAccess(accessContext, "update_attribute") === "permitido";
  const canDeactivateGlobalAttribute = catalogAccess(accessContext, "deactivate_attribute") === "permitido";
  const canReadGlobalAttributes = catalogAccess(accessContext, "read_attributes") === "permitido";
  const canReadUnits = catalogAccess(accessContext, "read_units") === "permitido";
  const canReactivateGlobalAttribute = catalogAccess(accessContext, "reactivate_attribute") === "permitido";
  const canUndoGlobalAttribute = catalogAccess(accessContext, "undo_attribute_change") === "permitido";
  const canCreateCategory = catalogAccess(accessContext, "create_category") === "permitido";
  const canUpdateCategory = catalogAccess(accessContext, "update_category") === "permitido";
  const canDeactivateCategory = catalogAccess(accessContext, "deactivate_category") === "permitido";
  const canReactivateCategory = catalogAccess(accessContext, "reactivate_category") === "permitido";
  const {
    data: categoryTree = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["categorias-arbol", actor],
    enabled: canReadCategories,
    queryFn: getCategoriasArbol,
  });
  const data: CategoriaArbol[] = [];
  const pendingCategories = [...categoryTree].reverse();
  while (pendingCategories.length) {
    const category = pendingCategories.pop();
    if (!category) continue;
    data.push(category);
    pendingCategories.push(...[...category.hijos].reverse());
  }
  const attributes = useQuery({
    queryKey: ["atributos-canonicos", actor],
    enabled: canReadCategoryAttributes,
    queryFn: async () =>
      (
        await api.get<{ items: AtributoOption[] }>("/atributos", {
          params: { limit: 1000, offset: 0, only_active: true },
        })
      ).data.items,
  });
  const [showAttributeHistory, setShowAttributeHistory] = useState(false);
  const inactiveAttributes = useQuery({
    queryKey: ["atributos-historial", actor],
    enabled: showAttributeHistory && canReadGlobalAttributes,
    queryFn: async () =>
      (
        await api.get<{ items: AtributoOption[] }>("/atributos", {
          params: { limit: 1000, offset: 0, only_active: false },
        })
      ).data.items.filter((attribute) => attribute.activo === false),
  });
  const [lifecycleTarget, setLifecycleTarget] = useState<{
    id: string;
    nombre: string;
    activo: boolean;
  } | null>(null);
  const attributeLifecycle = useQuery({
    queryKey: ["atributo-ciclo", actor, lifecycleTarget?.id],
    enabled: canReadGlobalAttributes && lifecycleTarget !== null,
    queryFn: async () =>
      (await api.get(`/atributos/${lifecycleTarget!.id}/reversion`)).data as {
        can_undo: boolean;
        can_reactivate: boolean;
        operacion: string | null;
        creado_en: string | null;
        valores_afectados: number;
        categorias_afectadas: number;
        motivo: string | null;
      },
  });
  const { data: catalogs = [] } = useCatalogs();
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [collisionTarget, setCollisionTarget] = useState<{
    id: string;
    nombre: string;
    parent_id?: string | null;
    message: string;
  } | null>(null);
  const [b3ConfirmationTarget, setB3ConfirmationTarget] =
    useState<B3ConfirmationDraft | null>(null);
  const create = useMutation({
    mutationFn: createCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-arbol"] });
      queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
      closeModal();
    },
    onError: async (error, payload) => {
      const { code, message } = parseApiError(error);
      if (code === "CATEGORY_CHANGE_REQUIRES_CONFIRMATION") {
        try {
          const preview = await previewCategoryCreate(payload);
          setB3ConfirmationTarget({ operation: "create", payload, preview });
          return;
        } catch (previewError) {
          const previewMessage = parseApiError(previewError).message;
          toast({
            variant: "destructive",
            title: "No se pudo previsualizar el impacto B3",
            description: previewMessage ?? message ?? "Intenta nuevamente.",
          });
          return;
        }
      }
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
      confirmReset,
    }: {
      id: string;
      nombre: string;
      parent_id?: string | null;
      confirmReset?: boolean;
    }) =>
      updateCategoria(id, {
        nombre,
        parent_id,
        confirmar_limpieza_colision: confirmReset || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-arbol"] });
      queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
      setCollisionTarget(null);
      closeModal();
    },
    onError: async (error, variables) => {
      const { code, message } = parseApiError(error);
      if (code === "CATEGORY_CHANGE_REQUIRES_CONFIRMATION") {
        const payload: CategoriaWrite = {
          nombre: variables.nombre,
          parent_id: variables.parent_id ?? null,
          ...(variables.confirmReset
            ? { confirmar_limpieza_colision: true }
            : {}),
        };
        try {
          const preview = await previewCategoryMove(variables.id, payload);
          setB3ConfirmationTarget({
            operation: "move",
            payload,
            categoryId: variables.id,
            preview,
          });
          return;
        } catch (previewError) {
          const previewMessage = parseApiError(previewError).message;
          toast({
            variant: "destructive",
            title: "No se pudo previsualizar el impacto B3",
            description: previewMessage ?? message ?? "Intenta nuevamente.",
          });
          return;
        }
      }
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
  const confirmB3 = useMutation({
    mutationFn: (draft: B3ConfirmationDraft) =>
      draft.operation === "create"
        ? confirmCategoryCreate(
            draft.payload,
            draft.preview.precondicion_preview,
          )
        : confirmCategoryMove(
            draft.categoryId!,
            draft.payload,
            draft.preview.precondicion_preview,
          ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categorias-arbol"] });
      await queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
      await queryClient.invalidateQueries({ queryKey: ["categorias-historial"] });
      setB3ConfirmationTarget(null);
      setMoveConfirmOpen(false);
      closeModal();
      toast({ variant: "success", title: "Categoría actualizada" });
    },
    onError: async (error, draft) => {
      const { code, message } = parseApiError(error);
      if (code === "CATALOG_PREVIEW_STALE") {
        try {
          const preview =
            draft.operation === "create"
              ? await previewCategoryCreate(draft.payload)
              : await previewCategoryMove(draft.categoryId!, draft.payload);
          if (preview.requiere_confirmacion) {
            setB3ConfirmationTarget({ ...draft, preview });
            toast({
              variant: "destructive",
              title: "El impacto B3 cambió",
              description: preview.resumen,
            });
            return;
          }
          setB3ConfirmationTarget(null);
          toast({
            title: "El impacto B3 cambió",
            description:
              "Ya no hay productos directos que reclasificar. Revisa el formulario y guarda de nuevo para aplicar el cambio.",
          });
          return;
        } catch (previewError) {
          setB3ConfirmationTarget(null);
          toast({
            variant: "destructive",
            title: "El preview B3 venció",
            description:
              parseApiError(previewError).message ??
              "Revisa el formulario y vuelve a intentar.",
          });
          return;
        }
      }
      if (
        code === "CATEGORY_ATTRIBUTE_COLLISION_REQUIRES_CONFIRMATION" &&
        draft.operation === "move" &&
        draft.categoryId
      ) {
        setB3ConfirmationTarget(null);
        setCollisionTarget({
          id: draft.categoryId,
          nombre: draft.payload.nombre,
          parent_id: draft.payload.parent_id,
          message: message ?? "El movimiento desplaza atributos heredados.",
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "No se pudo confirmar el cambio de categoría",
        description: message ?? "El borrador se conserva; vuelve a previsualizar.",
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
      queryClient.invalidateQueries({ queryKey: ["categorias-arbol"] });
      queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
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
  const reactivateCategory = useMutation({
    mutationFn: (id: string) => api.post(`/categorias/${id}/reactivar`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categorias-arbol"] });
      await queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
      await queryClient.invalidateQueries({ queryKey: ["categorias-historial"] });
      toast({ variant: "success", title: "Categoría reactivada" });
    },
    onError: (error) => {
      const { message } = parseApiError(error);
      toast({
        variant: "destructive",
        title: "No se pudo reactivar la categoría",
        description: message ?? "Intenta nuevamente.",
      });
    },
  });
  const deactivateAttribute = useMutation({
    mutationFn: (input: { id: string; precondition: string }) =>
      api.delete(`/atributos/${input.id}`, {
        data: {
          payload: { confirmar: true },
          precondicion_preview: input.precondition,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["atributos-canonicos"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["categoria-atributos"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["categoria-atributos"],
      });
      await queryClient.invalidateQueries({ queryKey: ["attribute-remap"] });
      await queryClient.invalidateQueries({ queryKey: ["unidades", actor] });
      setAttributeToDeactivate(null);
      setGlobalAttributeConfirmation(null);
      toast({ variant: "success", title: "Atributo dado de baja" });
    },
    onError: (error, input) => {
      const { code, message } = parseApiError(error);
      void queryClient.invalidateQueries({ queryKey: ["atributos-canonicos"] });
      void queryClient.invalidateQueries({ queryKey: ["attribute-remap"] });
      if (code === "CATALOG_PREVIEW_STALE") {
        setGlobalAttributeConfirmation(null);
        previewGlobalDeactivation.mutate({
          id: input.id,
          nombre: globalAttributeConfirmation?.nombre ?? "Atributo",
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "No se pudo dar de baja el atributo",
        description: message ?? "La baja no se aplicó; revisa el estado e inténtalo nuevamente.",
      });
    },
  });
  const [globalAttributeConfirmation, setGlobalAttributeConfirmation] =
    useState<{
      id: string;
      nombre: string;
      preview: CategoriaAtributoPreview;
    } | null>(null);
  const previewGlobalDeactivation = useMutation({
    mutationFn: async (target: { id: string; nombre: string }) =>
      (await api.post<CategoriaAtributoPreview>(
        `/atributos/${target.id}/previsualizar-baja`,
      )).data,
    onSuccess: (preview, target) =>
      setGlobalAttributeConfirmation({ ...target, preview }),
    onError: (error) => {
      const { message } = parseApiError(error);
      toast({
        variant: "destructive",
        title: "No se pudo previsualizar la baja global",
        description: message ?? "El atributo se mantiene activo.",
      });
    },
  });
  const undoAttributeLifecycle = useMutation({
    mutationFn: (id: string) => api.post(`/atributos/${id}/revertir`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["atributos-canonicos"] });
      await queryClient.invalidateQueries({ queryKey: ["atributos-historial"] });
      await queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
      await queryClient.invalidateQueries({ queryKey: ["attribute-remap"] });
      setLifecycleTarget(null);
      toast({ variant: "success", title: "Último cambio revertido" });
    },
    onError: async (error) => {
      const { message } = parseApiError(error);
      if (lifecycleTarget)
        await queryClient.invalidateQueries({
          queryKey: ["atributo-ciclo", actor, lifecycleTarget.id],
        });
      toast({
        variant: "destructive",
        title: "No se pudo restaurar el atributo",
        description: message ?? "El estado cambió; revisa la disponibilidad y conserva el borrador.",
      });
    },
  });
  const reactivateAttributeLifecycle = useMutation({
    mutationFn: (id: string) => api.post(`/atributos/${id}/reactivar`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["atributos-canonicos"] });
      await queryClient.invalidateQueries({ queryKey: ["atributos-historial"] });
      await queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
      await queryClient.invalidateQueries({ queryKey: ["attribute-remap"] });
      setLifecycleTarget(null);
      toast({ variant: "success", title: "Atributo reactivado" });
    },
    onError: async (error) => {
      const { message } = parseApiError(error);
      if (lifecycleTarget)
        await queryClient.invalidateQueries({
          queryKey: ["atributo-ciclo", actor, lifecycleTarget.id],
        });
      toast({
        variant: "destructive",
        title: "No se pudo reactivar el atributo",
        description: message ?? "El estado cambió; revisa el historial antes de reintentar.",
      });
    },
  });
  const [assignmentToConfigure, setAssignmentToConfigure] =
    useState<AtributoAplicable | null>(null);
  const [assignmentRequired, setAssignmentRequired] = useState(false);
  const [assignmentOrder, setAssignmentOrder] = useState("");
  const [assignmentDefault, setAssignmentDefault] = useState("");
  const [applyDefaultToExisting, setApplyDefaultToExisting] = useState(false);
  const [assignmentFormError, setAssignmentFormError] = useState("");
  const [backfillConfirmOpen, setBackfillConfirmOpen] = useState(false);
  const [assignmentPreview, setAssignmentPreview] = useState<{
    draft: AssignmentUpdate;
    preview: CategoriaAtributoPreview;
  } | null>(null);
  const updateAssignment = useMutation({
    mutationFn: async (input: AssignmentUpdate) => {
      if (input.override) {
        return assignExistingAttribute(input.categoria_id, {
          atributo_id: input.atributo_id,
          orden: input.orden,
          obligatorio: input.obligatorio,
          valor_default: input.valor_default,
          aplicar_default_a_existentes: input.aplicar_default_a_existentes,
          precondicion_preview: input.precondicion_preview,
        });
      }
      return (
        await api.put(`/categorias/${input.categoria_id}/atributos/${input.id}`, {
          orden: input.orden,
          obligatorio: input.obligatorio,
          valor_default: input.valor_default,
          aplicar_default_a_existentes: input.aplicar_default_a_existentes,
          precondicion_preview: input.precondicion_preview,
        })
      ).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["categoria-atributos"],
      });
      setAssignmentToConfigure(null);
      setAssignmentFormError("");
      setBackfillConfirmOpen(false);
      setAssignmentPreview(null);
      toast({
        variant: "success",
        title: "Configuración del atributo actualizada",
      });
    },
    onError: (error, input) => {
      const { code, message } = parseApiError(error);
      setAssignmentFormError(
        message ?? "No se pudo actualizar la configuración del atributo.",
      );
      if (code === "CATALOG_PREVIEW_STALE") {
        const draft = { ...input };
        delete draft.precondicion_preview;
        setAssignmentPreview(null);
        setBackfillConfirmOpen(false);
        void queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
        previewAssignment.mutate(draft);
      }
    },
  });
  const previewAssignment = useMutation({
    mutationFn: async (draft: AssignmentUpdate) =>
      previewCategoriaAtributo(
        draft.categoria_id,
        draft.override ? null : draft.id,
        {
          ...(draft.override ? { atributo_id: draft.atributo_id } : {}),
          orden: draft.orden,
          obligatorio: draft.obligatorio,
          valor_default: draft.valor_default,
          aplicar_default_a_existentes: draft.aplicar_default_a_existentes,
        },
      ),
    onSuccess: (preview, draft) => {
      setAssignmentPreview({ draft, preview });
      setBackfillConfirmOpen(true);
      setAssignmentFormError("");
    },
    onError: (error) => {
      const { message } = parseApiError(error);
      setAssignmentFormError(
        message ?? "No se pudo previsualizar la configuración del atributo.",
      );
    },
  });
  const previewLocalRemoval = useMutation({
    mutationFn: (input: {
      categoriaId: string;
      mappingId: string;
      attributeName: string;
    }) => previewRemoveCategoriaAtributo(input.categoriaId, input.mappingId),
    onSuccess: (preview, input) =>
      setLocalRemovalConfirmation({ ...input, preview }),
    onError: (error) => {
      const { message } = parseApiError(error);
      toast({
        variant: "destructive",
        title: "No se pudo previsualizar el retiro local",
        description:
          message ?? "La relación y los valores se mantienen sin cambios.",
      });
    },
  });
  const removeLocalAssignment = useMutation({
    mutationFn: (confirmation: NonNullable<typeof localRemovalConfirmation>) =>
      removeCategoriaAtributo(
        confirmation.categoriaId,
        confirmation.mappingId,
        confirmation.preview.precondicion_preview,
      ),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
      await queryClient.invalidateQueries({ queryKey: ["categorias-arbol"] });
      setLocalRemovalConfirmation(null);
      toast({
        variant: "success",
        title: "Atributo quitado de esta categoría",
        description: `${result.valores_desactivados} valores dejaron de aplicar.`,
      });
    },
    onError: async (error, confirmation) => {
      const { code, message } = parseApiError(error);
      if (code === "CATALOG_PREVIEW_STALE") {
        await queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
        setLocalRemovalConfirmation(null);
        previewLocalRemoval.mutate({
          categoriaId: confirmation.categoriaId,
          mappingId: confirmation.mappingId,
          attributeName: confirmation.attributeName,
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "No se pudo quitar el atributo local",
        description: message ?? "No se aplicaron cambios; el borrador se conserva.",
      });
    },
  });
  const [open, setOpen] = useState(false);
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [parentId, setParentId] = useState("");
  const [search, setSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const categoryHistory = useQuery({
    queryKey: ["categorias-historial", actor],
    enabled: showHistory && canReadCategories,
    queryFn: async () => {
      const response = await api.get<{ items: Categoria[] }>("/categorias", {
        params: { limit: 1000, offset: 0, only_active: false },
      });
      return response.data.items.filter((category) => !category.activo);
    },
  });
  const filtered = data.filter((item) =>
    item.nombre.toLowerCase().includes(search.toLowerCase()),
  );
  const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(
    null,
  );
  const effectiveAttributes = useQuery({
    queryKey: ["categoria-atributos", actor, selectedCategory?.id, "effective"],
    enabled: canReadCategoryAttributes && selectedCategory !== null,
    queryFn: () => getCategoriaAtributosEfectivos(selectedCategory!.id),
  });
  const ownAttributes = useQuery({
    queryKey: ["categoria-atributos", actor, selectedCategory?.id, "own"],
    enabled: canReadCategoryAttributes && selectedCategory !== null,
    queryFn: () => getCategoriaAtributosPropios(selectedCategory!.id),
  });
  const [newAttributeOpen, setNewAttributeOpen] = useState(false);
  const [attributeMode, setAttributeMode] = useState<"existing" | "new">("existing");
  const [existingAttributeSearch, setExistingAttributeSearch] = useState("");
  const [selectedExistingAttributeId, setSelectedExistingAttributeId] = useState("");
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(
    null,
  );
  const [attributePreview, setAttributePreview] =
    useState<AtributoPreview | null>(null);
  const [attributePreviewDraft, setAttributePreviewDraft] =
    useState<AtributoPreviewDraft | null>(null);
  const [attributeFormError, setAttributeFormError] = useState("");
  const [attributeName, setAttributeName] = useState("");
  const [attributeType, setAttributeType] = useState("string");
  const [attributeUsesUnit, setAttributeUsesUnit] = useState(false);
  const [attributeUnitId, setAttributeUnitId] = useState("");
  const [attributeOptions, setAttributeOptions] = useState("");
  const [attributeCatalogId, setAttributeCatalogId] = useState("");
  const [attributeRequired, setAttributeRequired] = useState(false);
  const [attributeDefault, setAttributeDefault] = useState("");
  const [attributeApplyDefaultToExisting, setAttributeApplyDefaultToExisting] =
    useState(false);
  const [createAttributeConfirmation, setCreateAttributeConfirmation] =
    useState<{
      draft: CategoryAttributeCreatePayload;
      preview: CategoriaAtributoPreview;
    } | null>(null);
  const [localRemovalConfirmation, setLocalRemovalConfirmation] = useState<{
    categoriaId: string;
    mappingId: string;
    attributeName: string;
    preview: CategoriaAtributoPreview;
  } | null>(null);
  const [allowNegative, setAllowNegative] = useState(false);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const attributeUnits = useQuery({
    queryKey: ["unidades", actor, "active"],
    queryFn: () =>
      listarUnidades({ only_active: true, limit: 1000, offset: 0 }),
    enabled:
      newAttributeOpen &&
      canReadUnits &&
      ["integer", "decimal"].includes(attributeType),
  });
  const selectedAttributeUnit =
    attributeUnits.data?.items.find((unit) => unit.id === attributeUnitId) ??
    attributes.data?.find((item) => item.id === editingAttributeId)?.unidad ??
    null;
  const buildAttributeDefinition = (): AtributoDefinition => {
    const options = attributeOptions
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return {
      nombre: attributeName.trim(),
      tipo_dato: attributeType,
      unidad_id: attributeUsesUnit ? attributeUnitId || null : null,
      select_options: attributeType === "select" ? options : undefined,
      catalog_id:
        attributeType === "catalog"
          ? attributeCatalogId || undefined
          : undefined,
      allow_negative:
        ["integer", "decimal"].includes(attributeType) && allowNegative,
      min_value: minValue ? Number(minValue) : undefined,
      max_value: maxValue ? Number(maxValue) : undefined,
    };
  };
  const assignmentCounts = new Map(
    data.map((category) => [category.id, category.atributos_efectivos_count]),
  );
  const categoryAssignments = effectiveAttributes.data ?? [];
  const configuredAttribute = categoryAssignments.find(
    (assignment) => assignment.atributo_id === assignmentToConfigure?.atributo_id,
  );
  const ownMappingIds = new Set(
    ownAttributes.data?.map((assignment) => assignment.mapping_id) ?? [],
  );
  const existingAttributeOptions = (attributes.data ?? []).filter((attribute) =>
    `${attribute.nombre} ${attribute.codigo ?? ""} ${attribute.tipo_dato} ${attribute.unidad?.nombre ?? ""} ${attribute.unidad?.simbolo ?? ""} ${attribute.unidad?.magnitud_codigo ?? ""} ${attribute.unidad_id ? "unidad configurada" : ""}`
      .toLocaleLowerCase()
      .includes(existingAttributeSearch.trim().toLocaleLowerCase()),
  );
  const selectedExistingMapping = categoryAssignments.find(
    (assignment) => assignment.atributo_id === selectedExistingAttributeId,
  );
  const roots = search.trim()
    ? filtered
    : categoryTree;
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
      !category.is_default &&
      !excludedParentIds.has(category.id),
  );
  const createAttribute = useMutation({
    mutationFn: async (input: {
      draft: CategoryAttributeCreatePayload;
      precondition?: string;
    }) =>
      (
        await api.post("/atributos", {
          ...input.draft,
          ...(input.precondition
            ? { precondicion_preview: input.precondition }
            : {}),
        })
      ).data,
    onError: (error, input) => {
      const { code, message } = parseApiError(error);
      setAttributeFormError(
        message ?? "No se pudo crear el atributo. El formulario se conserva.",
      );
      if (code === "CATALOG_PREVIEW_STALE") {
        setCreateAttributeConfirmation(null);
        void queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
        previewCreateAttribute.mutate(input.draft);
        return;
      }
      toast({
        variant: "destructive",
        title: "No se pudo crear el atributo",
        description:
          message ?? "Comprueba que el nombre no esté usado en otra categoría.",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atributos-canonicos"] });
      queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
      setNewAttributeOpen(false);
      setAttributeName("");
      setAttributeUsesUnit(false);
      setAttributeUnitId("");
      setAttributeOptions("");
      setAttributeCatalogId("");
      setAttributeRequired(false);
      setAttributeDefault("");
      setAttributeApplyDefaultToExisting(false);
      setCreateAttributeConfirmation(null);
      setAllowNegative(false);
      setMinValue("");
      setMaxValue("");
      toast({ variant: "success", title: "Atributo creado y asignado" });
    },
  });
  const previewCreateAttribute = useMutation({
    mutationFn: (draft: CategoryAttributeCreatePayload) =>
      previewCreateCategoryAttribute(draft),
    onSuccess: (preview, draft) => {
      setCreateAttributeConfirmation({ draft, preview });
      setAttributeFormError("");
    },
    onError: (error) => {
      const { message } = parseApiError(error);
      setAttributeFormError(
        message ?? "No se pudo previsualizar la creación del atributo.",
      );
    },
  });
  const submitCreateAttribute = () => {
    if (!selectedCategory) return;
    const definition = buildAttributeDefinition();
    if (attributeType === "select" && !definition.select_options?.length) {
      setAttributeFormError("Un atributo select requiere al menos una opción.");
      return;
    }
    const draft: CategoryAttributeCreatePayload = {
      categoria_id: selectedCategory.id,
      ...definition,
      obligatorio: attributeRequired,
      valor_default: attributeDefault.trim() || null,
      aplicar_default_a_existentes: attributeApplyDefaultToExisting,
    };
    if (draft.obligatorio || draft.aplicar_default_a_existentes) {
      previewCreateAttribute.mutate(draft);
      return;
    }
    createAttribute.mutate({ draft });
  };
  const assignExisting = useMutation({
    mutationFn: () =>
      assignExistingAttribute(selectedCategory!.id, {
        atributo_id: selectedExistingAttributeId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categoria-atributos"] });
      await queryClient.invalidateQueries({ queryKey: ["categorias-arbol"] });
      setNewAttributeOpen(false);
      setSelectedExistingAttributeId("");
      setExistingAttributeSearch("");
      toast({ variant: "success", title: "Atributo asignado" });
    },
    onError: (error) => {
      const { code, message } = parseApiError(error);
      setAttributeFormError(
        code === "ATTRIBUTE_ALREADY_ASSIGNED"
          ? "Este atributo ya está asignado a la categoría."
          : message ?? "No se pudo asignar el atributo.",
      );
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
    onSuccess: (preview, draft) => {
      setAttributePreview(preview);
      setAttributePreviewDraft({
        id: draft.id,
        definition: {
          ...draft.definition,
          select_options: draft.definition.select_options
            ? [...draft.definition.select_options]
            : undefined,
        },
      });
      setAttributeFormError("");
    },
    onError: (error) => {
      const { code, message } = parseApiError(error);
      setAttributeFormError(
        code === "PRODUCT_REQUIRED_ATTRIBUTES_MISSING"
          ? `${code}: ${message ?? "La conversión dejaría productos obligatorios sin un valor válido."}`
          : message ?? "No se pudo previsualizar la edición.",
      );
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
        queryKey: ["categoria-atributos"],
      });
      await queryClient.invalidateQueries({ queryKey: ["attribute-remap"] });
      setAttributePreview(null);
      setAttributePreviewDraft(null);
      setNewAttributeOpen(false);
      setEditingAttributeId(null);
      setAttributeFormError("");
      toast({ variant: "success", title: "Atributo actualizado" });
    },
    onError: (error) => {
      const { code, message } = parseApiError(error);
      setAttributeFormError(message ?? "No se pudo guardar la edición.");
      if (code === "CATALOG_PREVIEW_STALE") {
        setAttributePreview(null);
        setAttributePreviewDraft(null);
        void queryClient.invalidateQueries({
          queryKey: ["atributos-canonicos", actor],
        });
      }
    },
  });
  const openEditAttribute = (attributeId: string) => {
    const attribute = attributes.data?.find((item) => item.id === attributeId);
    if (!attribute) return;
    setEditingAttributeId(attribute.id);
    setAttributeName(attribute.nombre);
    setAttributeType(attribute.tipo_dato);
    setAttributeUsesUnit(Boolean(attribute.unidad_id));
    setAttributeUnitId(attribute.unidad_id ?? "");
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
  const openConfigureAssignment = (
    assignment: CategoriaAtributoEfectivo,
  ) => {
    setAssignmentToConfigure({
      id: assignment.mapping_id,
      categoria_id: selectedCategory?.id ?? "",
      atributo_id: assignment.atributo_id,
      orden: assignment.orden,
      obligatorio: assignment.obligatorio,
      valor_default:
        assignment.valor_default == null
          ? null
          : String(assignment.valor_default),
      categoria_origen_id: assignment.categoria_origen.id,
      profundidad: assignment.profundidad,
    });
    setAssignmentRequired(assignment.obligatorio ?? false);
    setAssignmentOrder(
      assignment.orden == null ? "" : String(assignment.orden),
    );
    setAssignmentDefault(
      assignment.valor_default == null ? "" : String(assignment.valor_default),
    );
    setApplyDefaultToExisting(false);
    setAssignmentFormError("");
    setBackfillConfirmOpen(false);
    setAssignmentPreview(null);
    setOpenAttributeMenuId(null);
  };
  const buildAssignmentUpdate = (): AssignmentUpdate | null => {
    if (!assignmentToConfigure || !selectedCategory) return null;
    return {
      id: assignmentToConfigure.id,
      categoria_id: selectedCategory.id,
      atributo_id: assignmentToConfigure.atributo_id,
      override: assignmentToConfigure.profundidad > 0,
      orden: assignmentOrder.trim() ? Number(assignmentOrder) : null,
      obligatorio: assignmentRequired,
      valor_default: assignmentDefault.trim() || null,
      aplicar_default_a_existentes: applyDefaultToExisting,
    };
  };
  const saveAssignmentConfiguration = async (
    draft: AssignmentUpdate,
    precondition?: string,
  ) => {
    await updateAssignment.mutateAsync({
      ...draft,
      ...(precondition ? { precondicion_preview: precondition } : {}),
    });
  };
  const submitAssignmentConfiguration = () => {
    if (!assignmentToConfigure) return;
    if (applyDefaultToExisting && !assignmentDefault.trim()) {
      setAssignmentFormError(
        "Ingresa un valor por defecto explícito para aplicarlo a productos existentes.",
      );
      return;
    }
    const draft = buildAssignmentUpdate();
    if (!draft) return;
    if (draft.obligatorio || draft.aplicar_default_a_existentes) {
      setAssignmentPreview(null);
      previewAssignment.mutate(draft);
      return;
    }
    void saveAssignmentConfiguration(draft);
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
        parent_id: parentId || undefined,
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
      parent_id: parentId || null,
    });
  };
  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Organiza categorías y sus atributos"
        actions={
          canCreateCategory ? <Button
            onClick={() => {
              setEditing(null);
              setNombre("");
              setParentId("");
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva categoría
          </Button> : null
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
            <Button
              className="mt-2"
              variant={showHistory ? "secondary" : "outline"}
              onClick={() => setShowHistory((current) => !current)}
              disabled={!canReadCategories}
            >
              {showHistory ? "Ocultar historial" : "Historial"}
            </Button>
          </div>
          {permissions.isPending ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Verificando permisos...
            </p>
          ) : permissions.isError ? (
            <p className="p-6 text-center text-sm text-destructive">
              No se pudieron verificar los permisos de categorías.
            </p>
          ) : !canReadCategories ? (
            <p className="p-6 text-center text-sm text-destructive">
              No tienes permiso para consultar categorías.
            </p>
          ) : isLoading ? (
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
                canUpdate={canUpdateCategory}
                canDeactivate={canDeactivateCategory}
              />
            ))
          )}
          {showHistory && canReadCategories && (
            <div className="border-t p-3" aria-label="Historial de categorías">
              <h3 className="mb-2 text-sm font-semibold">Categorías inactivas</h3>
              {categoryHistory.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando historial...</p>
              ) : categoryHistory.isError ? (
                <p className="text-sm text-destructive">No se pudo cargar el historial.</p>
              ) : categoryHistory.data?.length ? (
                <ul className="divide-y">
                  {categoryHistory.data.map((category) => (
                    <li key={category.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate text-sm">{category.nombre}</span>
                      {canReactivateCategory && !category.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reactivateCategory.isPending}
                          onClick={() => reactivateCategory.mutate(category.id)}
                        >
                          Reactivar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No hay categorías inactivas.</p>
              )}
            </div>
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
                <div className="flex flex-wrap gap-2">
                  {canReadGlobalAttributes && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAttributeHistory((current) => !current)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      {showAttributeHistory ? "Ocultar historial" : "Historial de atributos"}
                    </Button>
                  )}
                  {(canAssignAttribute || canCreateAndAssignAttribute) && (
                    <Button
                      onClick={() => {
                        setAttributeMode("existing");
                        setSelectedExistingAttributeId("");
                        setExistingAttributeSearch("");
                        setNewAttributeOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar atributo
                    </Button>
                  )}
                </div>
              </div>
              {!canReadCategoryAttributes ? (
                <p className="py-5 text-sm text-destructive">
                  No tienes permiso para consultar atributos de categoría.
                </p>
              ) : effectiveAttributes.isError ||
                ownAttributes.isError ||
                attributes.isError ? (
                <div className="flex flex-wrap items-center justify-between gap-3 py-5" role="alert">
                  <p className="text-sm text-destructive">
                    No se pudieron cargar los atributos efectivos de esta categoría.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void effectiveAttributes.refetch();
                      void ownAttributes.refetch();
                      void attributes.refetch();
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              ) : effectiveAttributes.isLoading ||
                ownAttributes.isLoading ||
                attributes.isLoading ? (
                <p className="py-5 text-sm text-muted-foreground">
                  Cargando atributos...
                </p>
              ) : categoryAssignments.length ? (
                <div className="divide-y border-y">
                  {categoryAssignments.map((assignment) => {
                    const attribute = attributes.data?.find(
                      (item) => item.id === assignment.atributo_id,
                    );
                    const inherited = !ownMappingIds.has(assignment.mapping_id);
                    return (
                      <div
                        key={assignment.mapping_id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_72px_88px_minmax(112px,128px)_36px] sm:gap-3"
                      >
                        <div className="col-span-2 min-w-0 sm:col-span-1">
                          <p className="break-words text-sm font-medium sm:truncate">
                            {assignment.nombre}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {assignment.tipo_dato}
                            {assignment.unidad
                              ? ` · ${assignment.unidad.simbolo}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 sm:contents">
                          <Badge
                            variant={inherited ? "secondary" : "default"}
                            title={
                              inherited
                                ? `Heredado de ${assignment.categoria_origen.nombre}`
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
                        </div>
                        <span className="col-span-2 text-xs text-muted-foreground sm:col-span-1 sm:max-w-32 sm:truncate">
                          {assignment.valor_default == null || assignment.valor_default === ""
                            ? "Sin valor por defecto"
                            : `${String(assignment.valor_default)}${assignment.unidad ? ` ${assignment.unidad.simbolo}` : ""}`}
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
                            aria-label={`Acciones de ${assignment.nombre}`}
                            aria-expanded={
                              openAttributeMenuId === assignment.mapping_id
                            }
                            aria-haspopup="menu"
                            onClick={() =>
                              setOpenAttributeMenuId((current) =>
                                current === assignment.mapping_id
                                  ? null
                                  : assignment.mapping_id,
                              )
                            }
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${openAttributeMenuId === assignment.mapping_id ? "rotate-180" : ""}`}
                            />
                          </Button>
                          {openAttributeMenuId === assignment.mapping_id && (
                            <div
                              className="absolute right-0 z-20 mt-1 min-w-36 rounded-md border bg-popover p-1 shadow-md"
                              role="menu"
                              aria-label={`Acciones de ${assignment.nombre}`}
                            >
                              {inherited && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => {
                                    const origin = data.find(
                                      (item) => item.id === assignment.categoria_origen.id,
                                    );
                                    if (origin) setSelectedCategory(origin);
                                    setOpenAttributeMenuId(null);
                                  }}
                                >
                                  Ver categoría de origen
                                </button>
                              )}
                              {canAssignAttribute && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => openConfigureAssignment(assignment)}
                                >
                                  <ListChecks className="h-4 w-4" />
                                  {inherited
                                    ? "Sobrescribir configuración aquí"
                                    : "Configurar categoría"}
                                </button>
                              )}
                              {!inherited && canAssignAttribute && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                                  disabled={previewLocalRemoval.isPending}
                                  onClick={() => {
                                    setOpenAttributeMenuId(null);
                                    previewLocalRemoval.mutate({
                                      categoriaId: selectedCategory!.id,
                                      mappingId: assignment.mapping_id,
                                      attributeName: assignment.nombre,
                                    });
                                  }}
                                >
                                  {previewLocalRemoval.isPending
                                    ? "Calculando impacto..."
                                    : "Quitar de esta categoría"}
                                </button>
                              )}
                              {canEditGlobalAttribute && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                                  disabled={!attribute}
                                  onClick={() => openEditAttribute(assignment.atributo_id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar definición global
                                </button>
                              )}
                              {(canUndoGlobalAttribute || canReactivateGlobalAttribute) && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => {
                                    setOpenAttributeMenuId(null);
                                    setLifecycleTarget({
                                      id: assignment.atributo_id,
                                      nombre: assignment.nombre,
                                      activo: true,
                                    });
                                  }}
                                >
                                  <History className="h-4 w-4" />
                                  Revisar último cambio global
                                </button>
                              )}
                              {canDeactivateGlobalAttribute && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                                  onClick={() => {
                                    setOpenAttributeMenuId(null);
                                    setAttributeToDeactivate({
                                      id: assignment.atributo_id,
                                      nombre: assignment.nombre,
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Dar de baja atributo global
                                </button>
                              )}
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
              {showAttributeHistory && canReadGlobalAttributes && (
                <div className="mt-4 border-t pt-4" aria-label="Historial de atributos">
                  <h3 className="mb-2 text-sm font-semibold">Atributos inactivos</h3>
                  {inactiveAttributes.isLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando historial...</p>
                  ) : inactiveAttributes.isError ? (
                    <div className="flex items-center justify-between gap-3" role="alert">
                      <p className="text-sm text-destructive">No se pudo cargar el historial de atributos.</p>
                      <Button type="button" variant="outline" onClick={() => void inactiveAttributes.refetch()}>
                        <RefreshCw className="mr-2 h-4 w-4" />Reintentar
                      </Button>
                    </div>
                  ) : inactiveAttributes.data?.length ? (
                    <ul className="divide-y border-y">
                      {inactiveAttributes.data.map((attribute) => (
                        <li key={attribute.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <span className="min-w-0">
                            <span className="block break-words text-sm font-medium">{attribute.nombre}</span>
                            <span className="block text-xs text-muted-foreground">
                              {attribute.tipo_dato} · {attribute.codigo ?? ""}
                              {attribute.actualizado_en ? ` · ${new Date(attribute.actualizado_en).toLocaleString("es-EC")}` : ""}
                            </span>
                          </span>
                          {(canReactivateGlobalAttribute || canUndoGlobalAttribute) && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setLifecycleTarget({
                                id: attribute.id,
                                nombre: attribute.nombre,
                                activo: false,
                              })}
                            >
                              Revisar ciclo
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-3 text-sm text-muted-foreground">No hay atributos inactivos.</p>
                  )}
                </div>
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
            !data.find((category) => category.id === parentId)?.tiene_hijos && (
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
          setSelectedExistingAttributeId("");
          setExistingAttributeSearch("");
          setCreateAttributeConfirmation(null);
        }}
        title={
          editingAttributeId
            ? "Editar atributo"
            : `${attributeMode === "existing" ? "Agregar atributo" : "Crear atributo"} · ${selectedCategory?.nombre ?? "Categoría"}`
        }
        subtitle="La unidad se guarda por separado de los valores del atributo."
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewAttributeOpen(false);
                setEditingAttributeId(null);
                setAttributeFormError("");
                setSelectedExistingAttributeId("");
                setExistingAttributeSearch("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editingAttributeId
                  ? submitAttributeEdit()
                  : attributeMode === "existing"
                    ? assignExisting.mutate()
                    : submitCreateAttribute()
              }
              disabled={
                assignExisting.isPending ||
                createAttribute.isPending ||
                previewCreateAttribute.isPending ||
                previewAttribute.isPending ||
                editAttribute.isPending ||
                (editingAttributeId
                  ? !attributeName.trim() ||
                    (attributeType === "select" && !attributeOptions.trim()) ||
                    (attributeUsesUnit &&
                      ["integer", "decimal"].includes(attributeType) &&
                      canReadUnits &&
                      !attributeUnitId)
                  : attributeMode === "existing"
                    ? !selectedExistingAttributeId ||
                      !canAssignAttribute ||
                      Boolean(selectedExistingMapping && ownMappingIds.has(selectedExistingMapping.mapping_id))
                    : !attributeName.trim() ||
                      !canCreateAndAssignAttribute ||
                      (attributeType === "select" && !attributeOptions.trim()) ||
                      (attributeUsesUnit &&
                        ["integer", "decimal"].includes(attributeType) &&
                        canReadUnits &&
                        !attributeUnitId))
              }
            >
              {editingAttributeId
                ? previewAttribute.isPending
                  ? "Calculando..."
                  : "Previsualizar cambios"
                : attributeMode === "existing"
                  ? assignExisting.isPending
                    ? "Asignando..."
                    : "Asignar atributo"
                  : createAttribute.isPending
                    ? "Guardando..."
                    : previewCreateAttribute.isPending
                      ? "Calculando impacto..."
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
          {!editingAttributeId && (
            <div className="flex gap-2" role="group" aria-label="Modo de atributo">
              <Button
                type="button"
                variant={attributeMode === "existing" ? "default" : "outline"}
                aria-pressed={attributeMode === "existing"}
                disabled={!canAssignAttribute}
                onClick={() => {
                  setAttributeMode("existing");
                  setAttributeFormError("");
                }}
              >
                Existente
              </Button>
              <Button
                type="button"
                variant={attributeMode === "new" ? "default" : "outline"}
                aria-pressed={attributeMode === "new"}
                disabled={!canCreateAndAssignAttribute}
                onClick={() => {
                  setAttributeMode("new");
                  setAttributeUsesUnit(false);
                  setAttributeUnitId("");
                  setAttributeFormError("");
                }}
              >
                Crear nuevo
              </Button>
            </div>
          )}
          {!editingAttributeId && attributeMode === "existing" ? (
            <div className="space-y-3">
              <FormField label="Buscar atributo existente">
                <Input
                  value={existingAttributeSearch}
                  onChange={(event) => setExistingAttributeSearch(event.target.value)}
                  placeholder="Nombre, código, tipo o unidad"
                />
              </FormField>
              <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                {existingAttributeOptions.length ? (
                  existingAttributeOptions.map((attribute) => {
                    const effective = categoryAssignments.find(
                      (assignment) => assignment.atributo_id === attribute.id,
                    );
                    const own = effective
                      ? ownMappingIds.has(effective.mapping_id)
                      : false;
                    const selected = selectedExistingAttributeId === attribute.id;
                    return (
                      <button
                        key={attribute.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={own}
                        onClick={() => {
                          setSelectedExistingAttributeId(attribute.id);
                          setAttributeFormError("");
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted disabled:opacity-60 ${selected ? "bg-muted" : ""}`}
                      >
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-medium">{attribute.nombre}</span>
                          <span className="block text-xs text-muted-foreground">
                            {attribute.tipo_dato}{attribute.unidad ? ` · ${attribute.unidad.simbolo} (${attribute.unidad.nombre})` : attribute.unidad_id ? " · unidad configurada" : ""} · {attribute.codigo ?? ""}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {own
                              ? "Ya asignado a esta categoría"
                              : effective?.heredado
                                ? `Heredado de ${effective.categoria_origen.nombre}; se puede asignar localmente`
                                : "Disponible para asignar"}
                          </span>
                        </span>
                        <Badge variant={effective?.heredado ? "secondary" : "outline"}>
                          {own ? "Propio" : effective?.heredado ? "Heredado" : "Global"}
                        </Badge>
                      </button>
                    );
                  })
                ) : (
                  <p className="p-3 text-sm text-muted-foreground">
                    No hay atributos que coincidan con la búsqueda.
                  </p>
                )}
              </div>
            </div>
          ) : (
          <>
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
          {editingAttributeId &&
            attributeUsesUnit &&
            !["integer", "decimal"].includes(attributeType) && (
              <p role="status" className="text-sm text-amber-800">
                La unidad {selectedAttributeUnit?.simbolo ?? "actual"} no se quitará al cambiar el tipo. Vuelve a un tipo numérico y desmarca “Usa unidad” para solicitar su retiro explícito.
              </p>
            )}
          {["integer", "decimal"].includes(attributeType) && (
            <>
              {canReadUnits && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={attributeUsesUnit}
                      onCheckedChange={(checked) =>
                        setAttributeUsesUnit(checked === true)
                      }
                      aria-label="Usa unidad"
                    />
                    Usa unidad
                  </label>
                  {attributeUsesUnit && (
                    <FormField label="Unidad">
                      <select
                        className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                        value={attributeUnitId}
                        onChange={(event) =>
                          setAttributeUnitId(event.target.value)
                        }
                        disabled={attributeUnits.isLoading || attributeUnits.isError}
                      >
                        <option value="">Seleccionar unidad</option>
                        {(attributeUnits.data?.items ?? [])
                          .filter((unit) => unit.activo)
                          .map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.nombre} ({unit.simbolo})
                            </option>
                          ))}
                      </select>
                    </FormField>
                  )}
                  {attributeUsesUnit && attributeUnits.isError && (
                    <p role="alert" className="text-sm text-destructive">
                      No se pudieron cargar las unidades activas.
                    </p>
                  )}
                </>
              )}
              {attributeUsesUnit && !canReadUnits && editingAttributeId && (
                <p className="text-sm text-muted-foreground">
                  Unidad configurada: {attributes.data?.find((item) => item.id === editingAttributeId)?.unidad?.nombre ?? "unidad actual"}
                  {attributes.data?.find((item) => item.id === editingAttributeId)?.unidad?.simbolo
                    ? ` (${attributes.data.find((item) => item.id === editingAttributeId)?.unidad?.simbolo})`
                    : ""}
                </p>
              )}
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
          {!editingAttributeId && (
            <FormField
              label={`Valor por defecto (opcional${attributeUsesUnit && selectedAttributeUnit ? ` · ${selectedAttributeUnit.simbolo}` : ""})`}
            >
              <Input
                type={
                  ["integer", "decimal"].includes(attributeType)
                    ? "number"
                    : "text"
                }
                step={attributeType === "decimal" ? "any" : undefined}
                value={attributeDefault}
                onChange={(event) => {
                  setAttributeDefault(event.target.value);
                  if (!event.target.value.trim())
                    setAttributeApplyDefaultToExisting(false);
                }}
              />
            </FormField>
          )}
          {!editingAttributeId && attributeDefault.trim() && (
            <label className="flex items-start gap-2 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={attributeApplyDefaultToExisting}
                onChange={(event) =>
                  setAttributeApplyDefaultToExisting(event.target.checked)
                }
              />
              <span>
                Aplicar el default a productos existentes sin valor
              </span>
            </label>
          )}
          </>
          )}
        </div>
      </DetailModal>
      <ConfirmDialog
        open={Boolean(attributePreview)}
        onClose={() => {
          setAttributePreview(null);
          setAttributePreviewDraft(null);
        }}
        title="Previsualización del cambio"
        description={
          attributePreview?.unidad_anotacion ? (
            <>
              <p>{attributePreview.resumen_anotacion_unidad}</p>
              <p>
                {attributePreview.unidad_anotacion.conteos.valores_activos} valores activos, {attributePreview.unidad_anotacion.conteos.valores_inactivos} inactivos y {attributePreview.unidad_anotacion.conteos.valores_historicos} históricos en {attributePreview.unidad_anotacion.conteos.productos_afectados} productos.
              </p>
              <p>
                {attributePreview.unidad_anotacion.conteos.defaults_actuales} defaults actuales y {attributePreview.unidad_anotacion.conteos.defaults_historicos} históricos. No se convierte ningún número ni se modifica ningún default.
              </p>
            </>
          ) : attributePreview && (
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
        confirmLabel={
          attributePreview?.unidad_anotacion
            ? "Confirmar anotación"
            : "Aplicar cambios"
        }
        confirmDisabled={
          Boolean(attributePreview?.remapeos_pendientes) ||
          editAttribute.isPending ||
          !attributePreviewDraft
        }
        onConfirm={async () => {
          if (!attributePreviewDraft) return;
          const annotation = attributePreview?.unidad_anotacion;
          await editAttribute.mutateAsync({
            id: attributePreviewDraft.id,
            definition: {
              ...attributePreviewDraft.definition,
              ...(annotation
                ? {
                    confirmar_anotacion_unidad: true,
                    precondicion_preview:
                      annotation.precondicion_preview ??
                      attributePreview?.precondicion_preview,
                  }
                : {}),
            },
          });
        }}
      />
      <ConfirmDialog
        open={Boolean(createAttributeConfirmation)}
        onClose={() => setCreateAttributeConfirmation(null)}
        title="Confirmar creación y asignación"
        description={
          createAttributeConfirmation?.preview.resumen ??
          "No hay una previsualización vigente. Vuelve al formulario y calcula el impacto."
        }
        details={
          createAttributeConfirmation && (
            <>
              {createAttributeConfirmation.preview.faltantes.length > 0 && (
                <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5">
                  {createAttributeConfirmation.preview.faltantes
                    .slice(0, 8)
                    .map((item) => (
                      <li key={item.id}>
                        <span className="font-medium">{item.nombre}</span>: {item.motivo}
                      </li>
                    ))}
                </ul>
              )}
              {createAttributeConfirmation.draft.aplicar_default_a_existentes ? (
                <p>
                  El default se aplicará solo donde falte un valor; no se modifican
                  valores existentes.
                </p>
              ) : createAttributeConfirmation.preview.faltantes.length > 0 ? (
                <p className="text-destructive">
                  Completa los productos listados o activa el backfill explícito en el
                  formulario.
                </p>
              ) : null}
            </>
          )
        }
        confirmLabel={
          createAttributeConfirmation?.draft.aplicar_default_a_existentes
            ? "Crear y aplicar a faltantes"
            : "Crear y asignar"
        }
        confirmDisabled={
          createAttribute.isPending ||
          !createAttributeConfirmation ||
          (Boolean(createAttributeConfirmation?.preview.faltantes.length) &&
            !createAttributeConfirmation?.draft.aplicar_default_a_existentes)
        }
        onConfirm={async () => {
          if (!createAttributeConfirmation) return;
          await createAttribute.mutateAsync({
            draft: createAttributeConfirmation.draft,
            precondition:
              createAttributeConfirmation.preview.precondicion_preview,
          });
        }}
      />
      <ConfirmDialog
        open={Boolean(localRemovalConfirmation)}
        onClose={() => setLocalRemovalConfirmation(null)}
        title={`Quitar ${localRemovalConfirmation?.attributeName ?? "atributo"} de esta categoría`}
        description={localRemovalConfirmation?.preview.resumen}
        details={
          localRemovalConfirmation && (
            <>
              {localRemovalConfirmation.preview.faltantes.length > 0 && (
                <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5">
                  {localRemovalConfirmation.preview.faltantes.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <span className="font-medium">{item.nombre}</span>: {item.motivo}
                    </li>
                  ))}
                </ul>
              )}
              {(localRemovalConfirmation.preview.remapeos?.length ?? 0) > 0 && (
                <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5">
                  {localRemovalConfirmation.preview.remapeos?.map((item) => (
                    <li key={item.id}>
                      <span className="font-medium">{item.nombre}</span>: {item.motivo}
                    </li>
                  ))}
                </ul>
              )}
              <p>
                Una asignación ancestral, si aplica, y los valores que sigan vigentes se
                conservarán. La baja global es una acción separada.
              </p>
            </>
          )
        }
        confirmLabel="Quitar de esta categoría"
        confirmDisabled={
          removeLocalAssignment.isPending ||
          !localRemovalConfirmation ||
          Boolean(localRemovalConfirmation?.preview.faltantes.length) ||
          Boolean(localRemovalConfirmation?.preview.remapeos?.length)
        }
        onConfirm={async () => {
          if (localRemovalConfirmation)
            await removeLocalAssignment.mutateAsync(localRemovalConfirmation);
        }}
      />
      <DetailModal
        open={Boolean(assignmentToConfigure)}
        onClose={() => {
          setAssignmentToConfigure(null);
          setAssignmentFormError("");
        }}
        title={`Configurar atributo ${attributes.data?.find((attribute) => attribute.id === assignmentToConfigure?.atributo_id)?.nombre ?? ""} en categoría ${selectedCategory?.nombre ?? ""}`}
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
              Atributo heredado de{" "}
              {data.find(
                (item) => item.id === assignmentToConfigure.categoria_origen_id,
              )?.nombre ?? "una categoría superior"}
              . Al guardar, la configuración se aplicará solo a esta categoría.
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
          <FormField label="Orden (opcional)">
            <Input
              type="number"
              min={0}
              step={1}
              value={assignmentOrder}
              onChange={(event) => setAssignmentOrder(event.target.value)}
            />
          </FormField>
          <FormField
            label={`Valor por defecto (opcional${configuredAttribute?.unidad ? ` · ${configuredAttribute.unidad.simbolo}` : ""})`}
          >
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
              onChange={(event) => {
                setAssignmentDefault(event.target.value);
                if (!event.target.value.trim()) setApplyDefaultToExisting(false);
              }}
            />
          </FormField>
          {assignmentDefault.trim() && (
            <>
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
        onClose={() => {
          setBackfillConfirmOpen(false);
          setAssignmentPreview(null);
        }}
        title="Confirmar configuración de atributo"
        description={
          assignmentPreview?.preview.resumen ??
          "No hay una previsualización vigente. Vuelve al formulario y calcula el impacto."
        }
        details={
          assignmentPreview && (
            <>
              {assignmentPreview.preview.faltantes.length > 0 && (
                <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5">
                  {assignmentPreview.preview.faltantes.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <span className="font-medium">{item.nombre}</span>: {item.motivo}
                    </li>
                  ))}
                </ul>
              )}
              {assignmentPreview.draft.aplicar_default_a_existentes ? (
                <p>
                  El default explícito se aplicará solo donde falte un valor; los valores
                  existentes se conservarán.
                </p>
              ) : assignmentPreview.preview.faltantes.length > 0 ? (
                <p className="text-destructive">
                  Activa el backfill explícito en el formulario o completa los productos
                  listados antes de confirmar.
                </p>
              ) : null}
            </>
          )
        }
        confirmLabel={
          assignmentPreview?.draft.aplicar_default_a_existentes
            ? "Aplicar a faltantes"
            : "Confirmar configuración"
        }
        confirmDisabled={
          previewAssignment.isPending ||
          updateAssignment.isPending ||
          !assignmentPreview ||
          (Boolean(assignmentPreview?.preview.faltantes.length) &&
            !assignmentPreview?.draft.aplicar_default_a_existentes)
        }
        onConfirm={async () => {
          if (!assignmentPreview) return;
          await saveAssignmentConfiguration(
            assignmentPreview.draft,
            assignmentPreview.preview.precondicion_preview,
          );
        }}
      />
      <ConfirmDialog
        open={Boolean(attributeToDeactivate)}
        onClose={() => setAttributeToDeactivate(null)}
        title={`Dar de baja ${attributeToDeactivate?.nombre ?? "atributo"}`}
        description="La baja es global: desactivará este atributo, sus asignaciones en todas las categorías y sus valores EAV activos. Los datos se conservarán y la acción podrá revertirse si no hay cambios posteriores."
        confirmLabel="Previsualizar baja"
        confirmDisabled={previewGlobalDeactivation.isPending}
        onConfirm={async () => {
          if (attributeToDeactivate)
            await previewGlobalDeactivation.mutateAsync(attributeToDeactivate);
        }}
      />
      <ConfirmDialog
        open={Boolean(globalAttributeConfirmation)}
        onClose={() => setGlobalAttributeConfirmation(null)}
        title={`Confirmar baja global de ${globalAttributeConfirmation?.nombre ?? "atributo"}`}
        description={globalAttributeConfirmation?.preview.resumen}
        details={
          globalAttributeConfirmation && (
            <>
              <p>
                {globalAttributeConfirmation.preview.conteos.asignaciones_activas ?? 0} asignaciones y{" "}
                {globalAttributeConfirmation.preview.conteos.valores_activos ?? 0} valores EAV quedarán inactivos.
              </p>
              {(globalAttributeConfirmation.preview.remapeos?.length ?? 0) > 0 && (
                <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5">
                  {globalAttributeConfirmation.preview.remapeos?.map((item) => (
                    <li key={item.id}>
                      <span className="font-medium">{item.nombre}</span>: {item.motivo}
                    </li>
                  ))}
                </ul>
              )}
              {(globalAttributeConfirmation.preview.remapeos?.length ?? 0) > 0 && (
                <p className="text-destructive">
                  Resuelve los remapeos pendientes antes de dar de baja el atributo.
                </p>
              )}
            </>
          )
        }
        confirmLabel="Dar de baja global"
        variant="danger"
        confirmDisabled={
          deactivateAttribute.isPending ||
          !globalAttributeConfirmation ||
          Boolean(globalAttributeConfirmation?.preview.remapeos?.length)
        }
        onConfirm={async () => {
          if (!globalAttributeConfirmation) return;
          await deactivateAttribute.mutateAsync({
            id: globalAttributeConfirmation.id,
            precondition:
              globalAttributeConfirmation.preview.precondicion_preview,
          });
        }}
      />
      <ConfirmDialog
        open={Boolean(lifecycleTarget)}
        onClose={() => setLifecycleTarget(null)}
        title={`Ciclo de vida de ${lifecycleTarget?.nombre ?? "atributo"}`}
        description={
          attributeLifecycle.isLoading
            ? "Consultando disponibilidad de restauración..."
            : attributeLifecycle.data?.operacion
              ? `Última operación: ${attributeLifecycle.data.operacion}. ${attributeLifecycle.data.creado_en ? new Date(attributeLifecycle.data.creado_en).toLocaleString("es-EC") : ""}`
              : attributeLifecycle.data?.motivo ?? "No hay información de restauración."
        }
        details={
          attributeLifecycle.data && (
            <div className="space-y-2">
              <p>
                {attributeLifecycle.data.valores_afectados} valores y{" "}
                {attributeLifecycle.data.categorias_afectadas} asignaciones en el snapshot.
              </p>
              {attributeLifecycle.data.motivo && (
                <p className="text-destructive">{attributeLifecycle.data.motivo}</p>
              )}
            </div>
          )
        }
        confirmLabel={
          attributeLifecycle.data?.can_reactivate
            ? "Reactivar atributo"
            : "Revertir último cambio"
        }
        confirmDisabled={
          attributeLifecycle.isLoading ||
          attributeLifecycle.isError ||
          !attributeLifecycle.data ||
          (attributeLifecycle.data.can_reactivate
            ? !canReactivateGlobalAttribute
            : !attributeLifecycle.data.can_undo || !canUndoGlobalAttribute) ||
          undoAttributeLifecycle.isPending ||
          reactivateAttributeLifecycle.isPending
        }
        onConfirm={async () => {
          if (!lifecycleTarget || !attributeLifecycle.data) return;
          if (attributeLifecycle.data.can_reactivate) {
            await reactivateAttributeLifecycle.mutateAsync(lifecycleTarget.id);
          } else if (attributeLifecycle.data.can_undo) {
            await undoAttributeLifecycle.mutateAsync(lifecycleTarget.id);
          }
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
              parent_id: parentId || null,
            });
          setMoveConfirmOpen(false);
        }}
      />
      <ConfirmDialog
        open={Boolean(b3ConfirmationTarget)}
        onClose={() => setB3ConfirmationTarget(null)}
        title="Reclasificar productos directos"
        description={
          b3ConfirmationTarget && (
            <span className="block space-y-2">
              <span className="block">{b3ConfirmationTarget.preview.resumen}</span>
              <span className="block">
                {b3ConfirmationTarget.preview.conteos.productos_directos ?? 0} productos pasarán a
                “Sin clasificar” bajo la categoría padre. No se modificarán cantidades ni
                documentos históricos.
              </span>
            </span>
          )
        }
        confirmLabel="Confirmar reclasificación"
        confirmDisabled={confirmB3.isPending}
        onConfirm={() => {
          if (b3ConfirmationTarget) confirmB3.mutate(b3ConfirmationTarget);
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
