import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DetailModal } from "@/components/shared/DetailModal";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { FilterBar } from "@/components/shared/FilterBar";
import { FormField } from "@/components/shared/FormField";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/contexts/AuthContext";
import {
  catalogAccess,
  type CatalogAccessContext,
} from "@/features/categorias/catalog-access";
import { getEffectivePermissions } from "@/features/personas/directory";
import {
  actualizarUnidad,
  crearUnidad,
  desactivarUnidad,
  listarUnidades,
  reactivarUnidad,
  type Unidad,
  type UnidadInput,
} from "@/features/unidades/api";

const PAGE_SIZE = 50;
const EMPTY_DRAFT: UnidadInput = {
  codigo: "",
  nombre: "",
  simbolo: "",
  magnitud_codigo: "",
};
const UNIT_ERROR_MESSAGES: Record<string, string> = {
  UNIT_DUPLICATE_CODE: "Ya existe una unidad con ese código.",
  UNIT_DUPLICATE_SYMBOL: "Ya existe una unidad con ese símbolo exacto.",
  UNIT_PROTECTED: "Las unidades del sistema no se pueden modificar.",
  UNIT_IN_USE: "La unidad conserva referencias actuales o históricas.",
  UNIT_INACTIVE: "La unidad está inactiva; reactívala antes de editarla.",
};

export default function UnidadesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const actor = user?.id == null ? null : String(user.id);
  const [search, setSearch] = useState("");
  const [magnitude, setMagnitude] = useState("");
  const [includeHistory, setIncludeHistory] = useState(false);
  const [offset, setOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Unidad | null>(null);
  const [draft, setDraft] = useState<UnidadInput>(EMPTY_DRAFT);
  const [pendingDeactivation, setPendingDeactivation] = useState<Unidad | null>(null);
  const deferredSearch = useDeferredValue(search);
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
  const canRead = catalogAccess(accessContext, "read_units") === "permitido";
  const canCreate = catalogAccess(accessContext, "create_unit") === "permitido";
  const canUpdate = catalogAccess(accessContext, "update_unit") === "permitido";
  const canDeactivate = catalogAccess(accessContext, "deactivate_unit") === "permitido";
  const canReactivate = catalogAccess(accessContext, "reactivate_unit") === "permitido";
  const units = useQuery({
    queryKey: [
      "unidades",
      actor,
      deferredSearch,
      magnitude,
      includeHistory,
      offset,
    ],
    queryFn: () =>
      listarUnidades({
        q: deferredSearch.trim() || undefined,
        magnitud_codigo: magnitude.trim() || undefined,
        only_active: !includeHistory,
        limit: PAGE_SIZE,
        offset,
      }),
    enabled: canRead,
  });
  const refreshUnits = () =>
    queryClient.invalidateQueries({ queryKey: ["unidades", actor] });
  const saveUnit = useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: UnidadInput }) =>
      id ? actualizarUnidad(id, input) : crearUnidad(input),
    onSuccess: () => {
      void refreshUnits();
      setFormOpen(false);
      setEditing(null);
      setDraft(EMPTY_DRAFT);
    },
  });
  const deactivateUnit = useMutation({
    mutationFn: desactivarUnidad,
    onSuccess: () => void refreshUnits(),
  });
  const reactivateUnit = useMutation({
    mutationFn: reactivarUnidad,
    onSuccess: () => void refreshUnits(),
  });

  const openCreate = () => {
    saveUnit.reset();
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
  };
  const openEdit = (unit: Unidad) => {
    saveUnit.reset();
    setEditing(unit);
    setDraft({
      codigo: unit.codigo,
      nombre: unit.nombre,
      simbolo: unit.simbolo,
      magnitud_codigo: unit.magnitud_codigo,
    });
    setFormOpen(true);
  };

  const columns: Column<Unidad>[] = [
    {
      key: "codigo",
      header: "Código",
      cell: (unit) => <span className="font-mono text-sm">{unit.codigo}</span>,
    },
    {
      key: "nombre",
      header: "Unidad",
      cell: (unit) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{unit.nombre}</span>
          <code className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs">
            {unit.simbolo}
          </code>
        </div>
      ),
    },
    {
      key: "magnitud",
      header: "Magnitud",
      cell: (unit) => unit.magnitud_codigo,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (unit) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={unit.activo ? "secondary" : "outline"}>
            {unit.activo ? "Activa" : "Inactiva"}
          </Badge>
          {unit.es_sistema && <Badge variant="outline">Sistema protegido</Badge>}
        </div>
      ),
    },
    {
      key: "uso",
      header: "Referencias",
      cell: (unit) => {
        if (!unit.uso) {
          return <span className="text-muted-foreground">Uso no disponible</span>;
        }
        const { atributos_activos, atributos_inactivos, snapshots_historicos } = unit.uso;
        const total = atributos_activos + atributos_inactivos + snapshots_historicos;
        return total === 0 ? (
          <span className="text-muted-foreground">Sin referencias</span>
        ) : (
          <span className="text-sm">
            {atributos_activos} activos · {atributos_inactivos} inactivos · {snapshots_historicos} históricos
          </span>
        );
      },
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (unit) => {
        if (unit.es_sistema) return <span className="text-xs text-muted-foreground">Protegida</span>;
        return (
          <div className="flex justify-end gap-1">
            {unit.activo && canUpdate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={`Editar ${unit.nombre}`}
                aria-label={`Editar ${unit.nombre}`}
                onClick={() => openEdit(unit)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {unit.activo && canDeactivate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={`Desactivar ${unit.nombre}`}
                aria-label={`Desactivar ${unit.nombre}`}
                onClick={() => setPendingDeactivation(unit)}
              >
                <Power className="h-4 w-4" />
              </Button>
            )}
            {!unit.activo && canReactivate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={`Reactivar ${unit.nombre}`}
                aria-label={`Reactivar ${unit.nombre}`}
                isLoading={reactivateUnit.isPending}
                onClick={() => reactivateUnit.mutate(unit.id)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (permissions.isPending && actor !== null) {
    return <p role="status" className="py-10 text-sm text-muted-foreground">Verificando permisos...</p>;
  }
  if (permissions.isError) {
    return (
      <ErrorState
        message="No se pudieron verificar los permisos de unidades."
        onRetry={() => void permissions.refetch()}
      />
    );
  }
  if (!canRead) {
    return (
      <section role="alert" className="py-10 text-sm text-muted-foreground">
        No tienes permiso para consultar el catálogo de unidades.
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Unidades de atributo"
        description="Catálogo global para atributos numéricos."
        actions={canCreate ? (
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva unidad
          </Button>
        ) : undefined}
      />
      {reactivateUnit.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorMessage(reactivateUnit.error, "No se pudo reactivar la unidad.", UNIT_ERROR_MESSAGES)}
        </p>
      )}
      <FilterBar className="rounded-md shadow-none">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setOffset(0);
          }}
          placeholder="Buscar por nombre, código o símbolo"
          aria-label="Buscar unidades"
        />
        <FormField label="Magnitud" className="min-w-48 flex-1 sm:flex-none">
          <Input
            value={magnitude}
            onChange={(event) => {
              setMagnitude(event.target.value);
              setOffset(0);
            }}
            placeholder="Código de magnitud"
            aria-label="Filtrar por magnitud"
          />
        </FormField>
        <label className="flex min-h-10 items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={includeHistory}
            onCheckedChange={(checked) => {
              setIncludeHistory(checked === true);
              setOffset(0);
            }}
            aria-label="Incluir historial"
          />
          Incluir historial
        </label>
      </FilterBar>
      <DataTable
        columns={columns}
        data={units.data?.items ?? []}
        rowKey={(unit) => unit.id}
        isLoading={units.isLoading}
        isError={units.isError}
        onRetry={() => void units.refetch()}
        emptyHeading="No hay unidades"
        emptyDescription="No hay unidades que coincidan con los filtros."
        pagination={{
          page: Math.floor(offset / PAGE_SIZE) + 1,
          pageSize: PAGE_SIZE,
          total: units.data?.meta.total ?? 0,
          totalPages: Math.max(1, units.data?.meta.page_count ?? 1),
          onPageChange: (page) => setOffset((page - 1) * PAGE_SIZE),
          itemLabel: "unidades",
        }}
      />
      <DetailModal
        open={formOpen}
        onClose={() => {
          if (saveUnit.isPending) return;
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "Editar unidad" : "Nueva unidad"}
        subtitle={editing?.uso && Object.values(editing.uso).some((count) => count > 0)
          ? `Referencias: ${editing.uso.atributos_activos} atributos activos, ${editing.uso.atributos_inactivos} inactivos y ${editing.uso.snapshots_historicos} snapshots.`
          : "Unidades globales para atributos numéricos."}
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveUnit.isPending}
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              isLoading={saveUnit.isPending}
              disabled={!draft.codigo.trim() || !draft.nombre.trim() || !draft.simbolo.trim() || !draft.magnitud_codigo.trim()}
              onClick={() => saveUnit.mutate({ id: editing?.id ?? null, input: draft })}
            >
              Guardar
            </Button>
          </div>
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Código" required>
            <Input value={draft.codigo} onChange={(event) => setDraft({ ...draft, codigo: event.target.value })} />
          </FormField>
          <FormField label="Nombre" required>
            <Input value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} />
          </FormField>
          <FormField label="Símbolo" required>
            <Input value={draft.simbolo} onChange={(event) => setDraft({ ...draft, simbolo: event.target.value })} />
          </FormField>
          <FormField label="Magnitud" required>
            <Input aria-label="Magnitud de la unidad" value={draft.magnitud_codigo} onChange={(event) => setDraft({ ...draft, magnitud_codigo: event.target.value })} />
          </FormField>
        </div>
        {saveUnit.isError && (
          <p role="alert" className="px-6 text-sm text-destructive">
            {getApiErrorMessage(saveUnit.error, "No se pudo guardar la unidad.", UNIT_ERROR_MESSAGES)}
          </p>
        )}
      </DetailModal>
      <ConfirmDialog
        open={pendingDeactivation !== null}
        onClose={() => setPendingDeactivation(null)}
        title="Desactivar unidad"
        description={pendingDeactivation
          ? `Se desactivará ${pendingDeactivation.nombre} (${pendingDeactivation.simbolo}).`
          : undefined}
        details={pendingDeactivation && Object.values(pendingDeactivation.uso).some((count) => count > 0)
          ? <p>El backend reporta referencias actuales o históricas; la operación se bloqueará si la unidad está en uso.</p>
          : undefined}
        confirmLabel="Desactivar"
        variant="danger"
        onConfirm={async () => {
          if (!pendingDeactivation) return;
          await deactivateUnit.mutateAsync(pendingDeactivation.id);
        }}
      />
    </section>
  );
}