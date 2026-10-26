import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "./PageHeader";
import { FilterBar } from "./FilterBar";
import { SearchInput } from "./SearchInput";
import { DataTable, type Column, type SortState } from "./DataTable";
import { DetailModal } from "./DetailModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { ErrorState } from "./ErrorState";
import { DirectoryForm } from "./DirectoryForm";
import {
  getDirectory,
  getPersona,
  getPersonaVinculos,
  setDirectoryActive,
  type Persona,
  type PersonaVinculos,
} from "@/features/personas/api";
import {
  directoryConfig,
  getEffectivePermissions,
  invalidateDirectorySession,
  resetDirectoryPassword,
  type DirectoryRecord,
  type DirectoryResource,
} from "@/features/personas/directory";
import { useDirectoryAccess } from "@/features/personas/directory-hooks";

function useRecordPersona(
  record: DirectoryRecord,
  resource: DirectoryResource,
) {
  const access = useDirectoryAccess();
  const projection =
    resource === "personas"
      ? (record as unknown as Persona)
      : (record.persona ?? record.persona_contacto);
  const id = record.persona_id ?? record.persona_contacto_id;
  const query = useQuery({
    queryKey: ["directory", access.scope, "persona", id],
    queryFn: ({ signal }) => getPersona(id!, signal),
    enabled: !!id && !projection && access.can("PERSONAS", "leer"),
    retry: false,
    staleTime: 60_000,
  });
  return { persona: projection ?? query.data, query };
}

export function DirectoryIdentity({
  record,
  resource,
  field = "nombre",
}: {
  record: DirectoryRecord;
  resource: DirectoryResource;
  field?: "nombre" | "identificacion" | "email" | "telefono";
}) {
  const { persona, query } = useRecordPersona(record, resource);
  if (query.isError)
    return (
      <span className="text-sm text-destructive">
        {getApiErrorMessage(query.error, "Persona no disponible")}
      </span>
    );
  return (
    <span>
      {persona
        ? field === "nombre"
          ? `${persona.nombre} ${persona.apellido}`
          : persona[field] || "-"
        : query.isLoading
          ? "Cargando..."
          : "Persona no disponible"}
    </span>
  );
}

export function DirectoryRoleBadges({ personaId }: { personaId: string }) {
  const access = useDirectoryAccess();
  const links = useQuery({
    queryKey: ["directory", access.scope, "links", personaId],
    queryFn: ({ signal }) => getPersonaVinculos(personaId, signal),
    enabled: access.can("PERSONAS", "leer"),
    retry: false,
  });
  if (links.isError)
    return (
      <span className="text-sm text-destructive">Vinculos no disponibles</span>
    );
  return (
    <div className="flex flex-wrap gap-1">
      {(["cliente", "proveedor_persona", "empleado", "usuario"] as const)
        .filter((name) => links.data?.[name])
        .map((name) => (
          <Badge
            key={name}
            variant={links.data?.[name]?.activo ? "secondary" : "outline"}
          >
            {name.replace("_", " ")}
            {links.data?.[name]?.activo ? "" : " (inactivo)"}
          </Badge>
        ))}
      {!!links.data?.proveedores_sociedad?.length && (
        <Badge variant="outline">Contacto Sociedad</Badge>
      )}
    </div>
  );
}

export function DirectoryDetails({
  record,
  resource,
  onClose,
  onNavigate,
}: {
  record: DirectoryRecord;
  resource: DirectoryResource;
  onClose: () => void;
  onNavigate: (resource: DirectoryResource, id: string) => void;
}) {
  const access = useDirectoryAccess();
  const { persona, query } = useRecordPersona(record, resource);
  const personaId = persona?.id;
  const links = useQuery({
    queryKey: ["directory", access.scope, "links", personaId],
    queryFn: ({ signal }) => getPersonaVinculos(personaId!, signal),
    enabled: !!personaId && access.can("PERSONAS", "leer"),
    retry: false,
  });
  const catalogs = useQuery({
    queryKey: [
      "directory",
      access.scope,
      "record-catalogs",
      resource,
      record.id,
    ],
    queryFn: async () => {
      const names: Record<string, string> = {};
      for (const [field, path] of [
        ["tipo_cliente_id", "tipos-cliente"],
        ["rol_id", "roles"],
        ["empresa_id", "empresas"],
      ] as const) {
        if (!record[field]) continue;
        const response = await api.get<{
          nombre?: string;
          razon_social?: string;
        }>(`/${path}/${record[field]}`);
        names[field] =
          response.data.nombre ??
          response.data.razon_social ??
          "Nombre no disponible";
      }
      return names;
    },
    enabled: resource !== "personas",
    retry: false,
  });
  const fields = directoryConfig[resource].fields.map((field) => ({
    label: field.label,
    value: (record[field.name as keyof DirectoryRecord] as string) ?? "-",
  }));
  if (record.tipo_cliente_id)
    fields.push({
      label: "Tipo de Cliente",
      value: catalogs.data?.tipo_cliente_id ?? "No disponible",
    });
  if (record.empresa_id)
    fields.push({
      label: "Empresa",
      value: catalogs.data?.empresa_id ?? "No disponible",
    });
  if (record.username)
    fields.push(
      { label: "Usuario", value: record.username },
      {
        label: "Rol",
        value: record.rol_nombre ?? catalogs.data?.rol_id ?? "No disponible",
      },
      {
        label: "Cambio obligatorio",
        value: record.requiere_cambio_password ? "Si" : "No",
      },
      {
        label: "Codigo de aprobacion",
        value: record.tiene_codigo_aprobacion
          ? "Configurado"
          : "No configurado",
      },
    );
  const related: Array<{
    resource: DirectoryResource;
    id: string;
    label: string;
  }> = [];
  for (const [name, target] of [
    ["cliente", "clientes"],
    ["proveedor_persona", "proveedores-persona"],
    ["empleado", "empleados"],
    ["usuario", "usuarios"],
  ] as const) {
    const link = links.data?.[name];
    if (link && access.can(directoryConfig[target].permission, "leer"))
      related.push({
        resource: target,
        id: link.id,
        label: `${directoryConfig[target].singular}${link.activo ? "" : " (inactivo)"}`,
      });
  }
  for (const society of links.data?.proveedores_sociedad ?? [])
    if (access.can("PROVEEDORES_SOCIEDAD", "leer"))
      related.push({
        resource: "proveedores-sociedad",
        id: society.id,
        label: society.razon_social,
      });
  return (
    <DetailModal
      open
      onClose={onClose}
      title={
        resource === "personas" && persona
          ? `${persona.nombre} ${persona.apellido}`
          : `Detalle ${directoryConfig[resource].singular}`
      }
      loading={query.isLoading}
      sections={[
        ...(persona
          ? [
              {
                title: "Persona",
                fields: [
                  {
                    label: "Nombre",
                    value: `${persona.nombre} ${persona.apellido}`,
                  },
                  { label: "Identificacion", value: persona.identificacion },
                  { label: "Email", value: persona.email },
                  { label: "Teléfono", value: persona.telefono },
                  { label: "Direccion", value: persona.direccion },
                  { label: "Ciudad", value: persona.ciudad },
                ],
              },
            ]
          : []),
        { title: "Datos", fields },
        {
          title: "Estado y auditoria",
          fields: [
            { label: "Estado", value: record.activo ? "Activo" : "Inactivo" },
            {
              label: "Creado",
              value: record.creado_en
                ? new Date(record.creado_en).toLocaleString("es-EC")
                : "-",
            },
            {
              label: "Actualizado",
              value: record.actualizado_en
                ? new Date(record.actualizado_en).toLocaleString("es-EC")
                : "-",
            },
            {
              label: "Responsable",
              value: record.usuario_auditoria || "No disponible",
            },
          ],
        },
      ]}
    >
      {(query.isError || links.isError || catalogs.isError) && (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorMessage(
            query.error ?? links.error ?? catalogs.error,
            "No se pudo cargar parte del detalle.",
          )}
        </p>
      )}
      {personaId && <DirectoryRoleBadges personaId={personaId} />}
      {related.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {related.map((item) => (
            <Button
              key={`${item.resource}-${item.id}`}
              variant="outline"
              onClick={() => onNavigate(item.resource, item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
      {resource === "empleados" && (
        <p className="text-sm">
          Reactivar Empleado no reactiva su Usuario. El acceso requiere una
          decision administrativa separada.
        </p>
      )}
    </DetailModal>
  );
}

export function DirectoryWorkspace({
  resources,
  initialResource,
}: {
  resources: DirectoryResource[];
  initialResource?: DirectoryResource;
}) {
  const access = useDirectoryAccess();
  const client = useQueryClient();
  const [resource, setResource] = useState<DirectoryResource>(
    initialResource ?? resources[0],
  );
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("activo");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState | null>({
    key:
      resource === "personas" || resource === "tipos-cliente"
        ? "nombre"
        : "creado_en",
    dir: "asc",
  });
  const [form, setForm] = useState<{ record?: DirectoryRecord } | null>(null);
  const [selected, setSelected] = useState<{
    resource: DirectoryResource;
    record: DirectoryRecord;
  } | null>(null);
  const [statusTarget, setStatusTarget] = useState<DirectoryRecord | null>(
    null,
  );
  const [security, setSecurity] = useState<{
    action: "reset" | "logout";
    record: DirectoryRecord;
  } | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [permissionTarget, setPermissionTarget] = useState<string | null>(null);
  const [navigationError, setNavigationError] = useState<unknown>(null);
  const config = directoryConfig[resource];
  const visible = resources.filter((item) =>
    access.can(directoryConfig[item].permission, "leer"),
  );
  const params = {
    limit: 20,
    offset: (page - 1) * 20,
    only_active: estado === "activo",
    estado: estado === "todos" ? undefined : (estado as "activo" | "inactivo"),
    q: search || undefined,
    sort_by: sort?.key,
    sort_direction: sort?.dir,
  };
  const list = useQuery({
    queryKey: ["directory", access.scope, "list", resource, params],
    queryFn: ({ signal }) =>
      getDirectory<DirectoryRecord>(resource, params, signal),
    enabled: access.can(config.permission, "leer"),
    retry: false,
  });
  const dependencies = useQuery({
    queryKey: [
      "directory",
      access.scope,
      "dependencies",
      resource,
      statusTarget?.id,
    ],
    queryFn: async ({ signal }) => {
      if (resource === "personas")
        return (
          (await getPersonaVinculos(statusTarget!.id, signal))
            .dependencias_activas ?? []
        );
      const result = await api.get<{
        dependencias_activas: PersonaVinculos["dependencias_activas"];
      }>(`/tipos-cliente/${statusTarget!.id}/vinculos`, { signal });
      if (!Array.isArray(result.data.dependencias_activas))
        throw new Error("Contrato de dependencias no disponible");
      return result.data.dependencias_activas;
    },
    enabled:
      !!statusTarget?.activo &&
      (resource === "personas" || resource === "tipos-cliente"),
    retry: false,
  });
  const permissions = useQuery({
    queryKey: ["directory", access.scope, "effective", permissionTarget],
    queryFn: () => getEffectivePermissions(permissionTarget!),
    enabled: !!permissionTarget,
    retry: false,
  });
  const navigate = async (target: DirectoryResource, id: string) => {
    setNavigationError(null);
    try {
      const response = await api.get<DirectoryRecord>(`/${target}/${id}`);
      setForm(null);
      setSelected({ resource: target, record: response.data });
    } catch (failure) {
      setNavigationError(failure);
    }
  };
  const toggle = async () => {
    if (!statusTarget) return;
    try {
      await setDirectoryActive(resource, statusTarget.id, !statusTarget.activo);
      await client.invalidateQueries({ queryKey: ["directory", access.scope] });
    } catch (failure) {
      if (resource === "personas" || resource === "tipos-cliente")
        await dependencies.refetch();
      throw failure;
    }
  };
  const changeResource = (next: string) => {
    setResource(next as DirectoryResource);
    setSearch("");
    setPage(1);
    setEstado("activo");
    setSort({
      key:
        next === "personas" || next === "tipos-cliente"
          ? "nombre"
          : "creado_en",
      dir: "asc",
    });
    setForm(null);
    setSelected(null);
    setStatusTarget(null);
    setTemporaryPassword(null);
  };
  const columns: Column<DirectoryRecord>[] =
    resource === "tipos-cliente"
      ? [
          {
            key: "nombre",
            header: "Nombre",
            sortable: true,
            cell: (row) => row.nombre,
          },
          {
            key: "descuento",
            header: "Descuento (%)",
            sortable: true,
            cell: (row) => row.descuento,
          },
        ]
      : resource === "proveedores-sociedad"
        ? [
            {
              key: "razon_social",
              header: "Razon social",
              sortable: true,
              cell: (row) => row.razon_social,
            },
            {
              key: "ruc",
              header: "RUC",
              sortable: true,
              cell: (row) => row.ruc,
            },
            {
              key: "contacto",
              header: "Contacto",
              cell: (row) => (
                <DirectoryIdentity record={row} resource={resource} />
              ),
            },
          ]
        : [
            {
              key: "identificacion",
              header: "Identificacion",
              sortable: true,
              cell: (row) => (
                <DirectoryIdentity
                  record={row}
                  resource={resource}
                  field="identificacion"
                />
              ),
            },
            {
              key: "nombre",
              header: "Nombre",
              sortable: true,
              cell: (row) => (
                <DirectoryIdentity record={row} resource={resource} />
              ),
            },
            ...(resource === "personas"
              ? [
                  {
                    key: "email",
                    header: "Email",
                    sortable: true,
                    cell: (row: DirectoryRecord) => (
                      <DirectoryIdentity
                        record={row}
                        resource={resource}
                        field="email"
                      />
                    ),
                  },
                  {
                    key: "telefono",
                    header: "Teléfono",
                    sortable: true,
                    cell: (row: DirectoryRecord) => (
                      <DirectoryIdentity
                        record={row}
                        resource={resource}
                        field="telefono"
                      />
                    ),
                  },
                  {
                    key: "roles",
                    header: "Roles",
                    cell: (row: DirectoryRecord) => (
                      <DirectoryRoleBadges personaId={row.id} />
                    ),
                  },
                ]
              : []),
            ...(resource === "usuarios"
              ? [
                  {
                    key: "username",
                    header: "Usuario",
                    cell: (row: DirectoryRecord) => row.username,
                  },
                  {
                    key: "rol",
                    header: "Rol",
                    cell: (row: DirectoryRecord) =>
                      row.rol_nombre ?? "No disponible",
                  },
                  {
                    key: "password_change",
                    header: "Cambio obligatorio",
                    cell: (row: DirectoryRecord) =>
                      row.requiere_cambio_password ? "Si" : "No",
                  },
                  {
                    key: "approval",
                    header: "Codigo de aprobacion",
                    cell: (row: DirectoryRecord) =>
                      row.tiene_codigo_aprobacion
                        ? "Configurado"
                        : "No configurado",
                  },
                  {
                    key: "security",
                    header: "Seguridad",
                    cell: (row: DirectoryRecord) => (
                      <div className="flex gap-1">
                        {access.can("USUARIOS", "actualizar") && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Restaurar clave ${row.username}`}
                              title="Restaurar clave"
                              onClick={() =>
                                setSecurity({ action: "reset", record: row })
                              }
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Invalidar sesion ${row.username}`}
                              title="Invalidar sesion"
                              onClick={() =>
                                setSecurity({ action: "logout", record: row })
                              }
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Permisos efectivos"
                          aria-label={`Permisos efectivos ${row.username}`}
                          onClick={() => setPermissionTarget(row.id)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]
              : []),
          ];
  columns.push({
    key: "estado",
    header: "Estado",
    cell: (row) => (
      <Badge variant={row.activo ? "success" : "secondary"}>
        {row.activo ? "Activo" : "Inactivo"}
      </Badge>
    ),
  });
  const needsDependencies =
    !!statusTarget?.activo &&
    (resource === "personas" || resource === "tipos-cliente");
  const blocking =
    needsDependencies &&
    (!dependencies.isSuccess || !!dependencies.data?.length);
  if (access.permissions.isLoading)
    return <p role="status">Consultando permisos...</p>;
  if (access.permissions.isError)
    return (
      <ErrorState
        message={getApiErrorMessage(
          access.permissions.error,
          "No se pudieron consultar los permisos efectivos.",
        )}
        onRetry={() => void access.permissions.refetch()}
      />
    );
  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title={config.title}
        actions={
          access.can(config.permission, "crear") ? (
            <Button onClick={() => setForm({})}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo {config.singular}
            </Button>
          ) : undefined
        }
      />
      {resources.length > 1 && (
        <Tabs value={resource} onValueChange={changeResource}>
          <TabsList className="h-auto w-full flex-wrap justify-start">
            {visible.map((item) => (
              <TabsTrigger key={item} value={item}>
                {directoryConfig[item].title}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {!!navigationError && (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorMessage(navigationError, "No se pudo abrir el registro.")}
        </p>
      )}
      {!access.can(config.permission, "leer") ? (
        <ErrorState message="No tienes permiso para consultar este modulo." />
      ) : (
        <>
          <FilterBar>
            <SearchInput
              aria-label="Buscar directorio"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Buscar por identificacion, nombre, email o telefono..."
            />
            <select
              aria-label="Estado del directorio"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value);
                setPage(1);
              }}
            >
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="todos">Todos</option>
            </select>
          </FilterBar>
          {list.isError && (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(
                list.error,
                "No se pudo cargar el directorio.",
              )}
            </p>
          )}
          <DataTable
            columns={columns}
            data={list.data?.items ?? []}
            rowKey={(row) => row.id}
            isLoading={list.isLoading}
            isError={list.isError}
            onRetry={() => void list.refetch()}
            sort={sort}
            onSortChange={(next) => {
              setSort(next);
              setPage(1);
            }}
            pagination={{
              page,
              pageSize: 20,
              total: list.data?.meta.total ?? 0,
              totalPages: Math.max(
                1,
                Math.ceil((list.data?.meta.total ?? 0) / 20),
              ),
              onPageChange: setPage,
            }}
            rowActions={{
              getLabel: (row) =>
                `${config.singular.toLowerCase()} ${row.nombre ?? row.razon_social ?? row.username ?? (row.persona ? `${row.persona.nombre} ${row.persona.apellido}` : "seleccionado")}${resource === "personas" ? ` ${row.apellido ?? ""}` : ""}`,
              isActive: (row) => row.activo,
              onView: (row) => setSelected({ resource, record: row }),
              onEdit: access.can(config.permission, "actualizar")
                ? (row) => setForm({ record: row })
                : undefined,
              canToggleActive: (row) =>
                access.can(
                  config.permission,
                  row.activo ? "eliminar" : "actualizar",
                ),
              onToggleActive: (row) => {
                if (
                  access.can(
                    config.permission,
                    row.activo ? "eliminar" : "actualizar",
                  )
                )
                  setStatusTarget(row);
              },
            }}
            emptyHeading={search ? "Sin coincidencias" : "No hay registros"}
          />
        </>
      )}
      {form && (
        <DirectoryForm
          key={`${resource}-${form.record?.id ?? "new"}`}
          resource={resource}
          record={form.record}
          onClose={() => setForm(null)}
          onSaved={(record) => {
            setForm(null);
            setSelected({ resource, record });
          }}
          onExisting={(id) => void navigate(resource, id)}
        />
      )}
      {selected && (
        <DirectoryDetails
          key={`${selected.resource}-${selected.record.id}`}
          resource={selected.resource}
          record={selected.record}
          onClose={() => setSelected(null)}
          onNavigate={(target, id) => void navigate(target, id)}
        />
      )}
      {statusTarget && (
        <ConfirmDialog
          key={`${resource}-${statusTarget.id}`}
          open
          onClose={() => setStatusTarget(null)}
          title={`${statusTarget.activo ? "Desactivar" : "Reactivar"} ${config.singular}`}
          confirmLabel={statusTarget.activo ? "Desactivar" : "Reactivar"}
          variant={statusTarget.activo ? "danger" : "default"}
          confirmDisabled={blocking}
          description={
            <span className="block space-y-2">
              {needsDependencies && (
                <span className="block">
                  {dependencies.isLoading
                    ? "Comprobando dependencias..."
                    : dependencies.isError
                      ? "No se pudieron comprobar dependencias. La baja esta bloqueada."
                      : dependencies.data?.length
                        ? `Dependencias activas: ${dependencies.data.map((item) => item.nombre).join(", ")}`
                        : "Sin dependencias activas."}
                  {dependencies.isError && (
                    <Button
                      variant="outline"
                      onClick={() => void dependencies.refetch()}
                    >
                      Reintentar
                    </Button>
                  )}
                </span>
              )}
              {resource === "empleados" && (
                <span className="block">
                  {statusTarget.activo
                    ? "Se desactivara su Usuario y se revocaran sus sesiones."
                    : "Su Usuario no se reactivara automaticamente. Revisa su acceso por separado."}
                </span>
              )}
            </span>
          }
          onConfirm={toggle}
        />
      )}
      {security && (
        <ConfirmDialog
          open
          title={
            security.action === "reset" ? "Restaurar clave" : "Invalidar sesion"
          }
          description={security.record.username}
          onClose={() => setSecurity(null)}
          onConfirm={async () => {
            if (security.action === "reset")
              setTemporaryPassword(
                await resetDirectoryPassword(security.record.id),
              );
            else await invalidateDirectorySession(security.record.id);
            await client.invalidateQueries({
              queryKey: ["directory", access.scope, "list", "usuarios"],
            });
          }}
        />
      )}
      {temporaryPassword && (
        <DetailModal
          open
          title="Contrasena temporal"
          onClose={() => setTemporaryPassword(null)}
          sections={[
            {
              fields: [
                { label: "Contrasena temporal", value: temporaryPassword },
              ],
            },
          ]}
        />
      )}
      {permissionTarget && (
        <DetailModal
          open
          title="Permisos efectivos"
          onClose={() => setPermissionTarget(null)}
          loading={permissions.isLoading}
          error={permissions.isError}
          onRetry={() => void permissions.refetch()}
          sections={permissions.data?.map((item) => ({
            title: item.nombre,
            fields: [
              { label: "Leer", value: item.puede_leer ? "Si" : "No" },
              { label: "Crear", value: item.puede_crear ? "Si" : "No" },
              {
                label: "Actualizar",
                value: item.puede_actualizar ? "Si" : "No",
              },
              { label: "Eliminar", value: item.puede_eliminar ? "Si" : "No" },
            ],
          }))}
        />
      )}
    </div>
  );
}
