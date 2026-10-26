import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DetailModal } from "./DetailModal";
import { ConfigurableFields } from "./ConfigurableFields";
import { PersonaFields, emptyPersona } from "./PersonaFields";
import { SearchOrCreatePersona } from "./SearchOrCreatePersona";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api-error";
import {
  getDirectory,
  getPersonaVinculos,
  getTiposContribuyente,
  setDirectoryActive,
  updateDirectory,
  updatePersona,
  createPersona,
  type PersonaCreateInput,
  type PersonaSelection,
} from "@/features/personas/api";
import {
  buildDirectoryInput,
  createDirectory,
  directoryConfig,
  supportsComposite,
  type DirectoryRecord,
  type DirectoryResource,
} from "@/features/personas/directory";
import { useDirectoryAccess } from "@/features/personas/directory-hooks";
import { FormField } from "./FormField";
import { SearchableSelect } from "./SearchableSelect";

export function DirectoryCatalogField({
  resource,
  label,
  value,
  onChange,
  scope,
  error,
  disabled,
}: {
  resource: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  scope: string;
  error?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["directory", scope, "catalog", resource, search],
    queryFn: ({ signal }) =>
      getDirectory<{ id: string; nombre?: string; razon_social?: string }>(
        resource,
        { limit: 20, offset: 0, only_active: true, q: search || undefined },
        signal,
      ),
    enabled: !disabled,
  });
  const selected = useQuery({
    queryKey: ["directory", scope, "catalog-detail", resource, value],
    queryFn: async () =>
      (await import("@/lib/api")).default
        .get<{
          id: string;
          nombre?: string;
          razon_social?: string;
        }>(`/${resource}/${value}`)
        .then((response) => response.data),
    enabled: !!value && !disabled,
  });
  const options = [...(query.data?.items ?? [])];
  if (selected.data && !options.some((item) => item.id === selected.data.id))
    options.push(selected.data);
  return (
    <FormField
      label={label}
      required
      error={
        error ??
        (query.isError
          ? getApiErrorMessage(query.error, "No se pudo cargar el catalogo.")
          : undefined)
      }
    >
      <SearchableSelect
        value={value || null}
        onChange={onChange}
        options={options.map((item) => ({
          value: item.id,
          label: item.nombre ?? item.razon_social ?? "Nombre no disponible",
        }))}
        onSearch={setSearch}
        disabled={disabled}
        placeholder={query.isLoading ? "Cargando..." : "Seleccionar"}
      />
    </FormField>
  );
}

export function DirectoryForm({
  resource,
  record,
  onClose,
  onSaved,
  onExisting,
}: {
  resource: DirectoryResource;
  record?: DirectoryRecord;
  onClose: () => void;
  onSaved: (record: DirectoryRecord) => void;
  onExisting: (id: string) => void;
}) {
  const access = useDirectoryAccess();
  const client = useQueryClient();
  const config = directoryConfig[resource];
  const editing = !!record;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(record ?? {})
        .filter(
          ([, value]) => typeof value === "string" || typeof value === "number",
        )
        .map(([name, value]) => [name, String(value)]),
    ),
  );
  const [persona, setPersona] = useState<PersonaCreateInput>(() => {
    const source = resource === "personas" ? record : record?.persona;
    return source
      ? ({
          ...emptyPersona,
          ...Object.fromEntries(
            Object.entries(source).filter(
              ([name, value]) =>
                [
                  "tipo_identificacion",
                  "identificacion",
                  "nombre",
                  "apellido",
                  "direccion",
                  "telefono",
                  "ciudad",
                  "email",
                ].includes(name) && typeof value === "string",
            ),
          ),
        } as PersonaCreateInput)
      : emptyPersona;
  });
  const [selection, setSelection] = useState<PersonaSelection>({
    kind: "none",
  });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [changingContact, setChangingContact] = useState(false);
  const change = (name: string, value: string) =>
    setValues((previous) => ({ ...previous, [name]: value }));
  const selectedId =
    selection.kind === "existing" ? selection.persona.id : undefined;
  const links = useQuery({
    queryKey: ["directory", access.scope, "links", selectedId],
    queryFn: ({ signal }) => getPersonaVinculos(selectedId!, signal),
    enabled: !!selectedId,
    retry: false,
  });
  const linkedRole = config.link ? links.data?.[config.link] : null;
  const userConflict = resource === "empleados" ? links.data?.usuario : null;
  const hasIdentity = resource !== "personas" && resource !== "tipos-cliente";
  const needIdentity =
    hasIdentity &&
    (!editing || (resource === "proveedores-sociedad" && changingContact));
  const compatible =
    access.contract.data && supportsComposite(access.contract.data, resource);
  const requiresContract = hasIdentity && (!editing || changingContact);
  const errors = getApiFieldErrors(failure);
  const prefix =
    resource === "proveedores-sociedad"
      ? "persona_contacto_nueva."
      : "persona_nueva.";
  const personaErrors = Object.fromEntries(
    Object.entries(errors)
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, message]) => [name.slice(prefix.length), message]),
  );
  const contribu = useQuery({
    queryKey: ["directory", access.scope, "contribuyentes"],
    queryFn: getTiposContribuyente,
    enabled: resource.startsWith("proveedores-"),
  });
  const catalogs =
    resource === "clientes"
      ? [
          {
            resource: "tipos-cliente",
            name: "tipo_cliente_id",
            label: "Tipo de Cliente",
          },
        ]
      : resource === "empleados"
        ? [{ resource: "empresas", name: "empresa_id", label: "Empresa" }]
        : [];
  const withAccess =
    resource === "usuarios" || (resource === "empleados" && !editing);
  if (withAccess)
    catalogs.push({ resource: "roles", name: "rol_id", label: "Rol" });
  const credentials =
    withAccess && !editing
      ? [
          { name: "username", label: "Usuario", required: true, minLength: 3 },
          {
            name: "password",
            label: "Contrasena",
            type: "password" as const,
            required: true,
            minLength: 8,
          },
        ]
      : [];
  const submit = async () => {
    if (
      busy ||
      (needIdentity && selection.kind === "none") ||
      linkedRole ||
      userConflict ||
      (requiresContract && !compatible)
    )
      return;
    if (!access.can(config.permission, editing ? "actualizar" : "crear"))
      return;
    if (
      catalogs.some((catalog) => !values[catalog.name]) ||
      (resource.startsWith("proveedores-") && !values.tipo_contribuyente_id)
    ) {
      setFailure({
        response: {
          data: { detail: "Selecciona los campos obligatorios del catalogo." },
        },
      });
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      let saved: DirectoryRecord;
      if (resource === "personas") {
        const normalized = {
          ...persona,
          ...Object.fromEntries(
            ["direccion", "telefono", "ciudad", "email"].map((name) => [
              name,
              (persona as unknown as Record<string, string>)[name] ||
                (editing ? null : undefined),
            ]),
          ),
        };
        saved = (editing
          ? await updatePersona(
              record!.id,
              normalized as Parameters<typeof updatePersona>[1],
            )
          : await createPersona(normalized)) as unknown as DirectoryRecord;
      } else {
        const payload = buildDirectoryInput(
          resource,
          values,
          selection,
          editing,
        );
        saved = editing
          ? await updateDirectory<DirectoryRecord>(
              resource,
              record!.id,
              payload,
            )
          : await createDirectory(resource, payload);
      }
      await client.invalidateQueries({ queryKey: ["directory", access.scope] });
      await client.invalidateQueries({ queryKey: ["personas"] });
      onSaved(saved);
    } catch (error) {
      setFailure(error);
      if (selectedId) void links.refetch();
    } finally {
      setBusy(false);
    }
  };
  const restoreRole = async () => {
    if (!linkedRole || !access.can(config.permission, "actualizar")) return;
    setBusy(true);
    try {
      await setDirectoryActive(resource, linkedRole.id, true);
      await client.invalidateQueries({ queryKey: ["directory", access.scope] });
      onExisting(linkedRole.id);
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <DetailModal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title={`${editing ? "Editar" : "Nuevo"} ${config.singular}`}
      size="lg"
      footer={<></>}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {!!failure && (
          <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(
              failure,
              "No se pudo guardar. Revisa los datos o reintenta.",
            )}
          </p>
        )}
        {requiresContract && !compatible && (
          <p role="alert" className="text-sm text-destructive">
            {access.contract.isLoading
              ? "Verificando contrato del servidor..."
              : "El servidor no confirma soporte para esta operacion compuesta. Alta deshabilitada."}
          </p>
        )}
        {resource === "personas" && (
          <PersonaFields
            value={persona}
            onChange={setPersona}
            errors={errors}
            disabled={busy}
          />
        )}
        {needIdentity && (
          <SearchOrCreatePersona
            value={selection}
            onChange={setSelection}
            forzarRUCnatural={resource === "proveedores-persona"}
            canCreate={access.can("PERSONAS", "crear")}
            canReactivate={access.can("PERSONAS", "actualizar")}
            errors={personaErrors}
            disabled={busy}
          />
        )}
        {selectedId && links.isLoading && (
          <p role="status">Consultando vinculos...</p>
        )}
        {selectedId && links.isError && (
          <p role="alert">
            {getApiErrorMessage(
              links.error,
              "No se pudieron comprobar los vinculos.",
            )}{" "}
            <Button
              type="button"
              variant="outline"
              onClick={() => void links.refetch()}
            >
              Reintentar
            </Button>
          </p>
        )}
        {linkedRole && (
          <div className="space-y-2">
            <p role="alert">
              Esta Persona ya tiene {config.singular}{" "}
              {linkedRole.activo ? "activo" : "inactivo"}.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onExisting(linkedRole.id)}
            >
              Ver existente
            </Button>
            {!linkedRole.activo &&
              access.can(config.permission, "actualizar") && (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void restoreRole()}
                >
                  Reactivar {config.singular}
                </Button>
              )}
          </div>
        )}
        {userConflict && (
          <p role="alert">
            La Persona ya tiene Usuario. Su acceso requiere una decision
            administrativa separada.
          </p>
        )}
        {editing && hasIdentity && (
          <p className="text-sm">
            Persona:{" "}
            {record.persona
              ? `${record.persona.nombre} ${record.persona.apellido}`
              : record.persona_contacto
                ? `${record.persona_contacto.nombre} ${record.persona_contacto.apellido}`
                : "Consulta el detalle de Persona"}
          </p>
        )}
        {resource === "proveedores-sociedad" && editing && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setChangingContact(!changingContact);
              setSelection({ kind: "none" });
            }}
          >
            {changingContact
              ? "Cancelar cambio de contacto"
              : "Cambiar contacto"}
          </Button>
        )}
        <ConfigurableFields
          fields={config.fields}
          values={values}
          onChange={change}
          errors={errors}
          disabled={busy}
        />
        {catalogs.map((catalog) => (
          <DirectoryCatalogField
            key={catalog.name}
            resource={catalog.resource}
            label={catalog.label}
            value={values[catalog.name] ?? ""}
            onChange={(value) => change(catalog.name, value)}
            scope={access.scope}
            error={errors[catalog.name] ?? errors[`usuario.${catalog.name}`]}
            disabled={busy}
          />
        ))}
        {resource.startsWith("proveedores-") && (
          <FormField
            label="Tipo de contribuyente"
            required
            error={
              errors.tipo_contribuyente_id ??
              (contribu.isError
                ? getApiErrorMessage(
                    contribu.error,
                    "No se pudo cargar el catalogo.",
                  )
                : undefined)
            }
          >
            <select
              className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
              required
              value={values.tipo_contribuyente_id ?? ""}
              disabled={busy || contribu.isLoading}
              onChange={(event) =>
                change("tipo_contribuyente_id", event.target.value)
              }
            >
              <option value="">Seleccionar</option>
              {contribu.data
                ?.filter(
                  (item) =>
                    item.activo &&
                    (resource === "proveedores-persona"
                      ? item.aplica_persona_natural
                      : item.aplica_sociedad),
                )
                .map((item) => (
                  <option key={item.codigo} value={item.codigo}>
                    {item.nombre}
                  </option>
                ))}
            </select>
          </FormField>
        )}
        {credentials.length > 0 && (
          <ConfigurableFields
            fields={credentials}
            values={values}
            onChange={change}
            errors={{
              ...errors,
              username: errors["usuario.username"] ?? errors.username,
              password: errors["usuario.password"] ?? errors.password,
            }}
            disabled={busy}
          />
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={busy}
            disabled={
              busy ||
              (requiresContract && !compatible) ||
              (needIdentity && selection.kind === "none") ||
              (!!selectedId && !links.isSuccess) ||
              !!linkedRole ||
              !!userConflict
            }
          >
            {editing ? "Actualizar" : "Guardar"}
          </Button>
        </div>
      </form>
    </DetailModal>
  );
}
