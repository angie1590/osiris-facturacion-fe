import api from "@/lib/api";
import {
  contactReference,
  personaReference,
  type Persona,
  type PersonaSelection,
  type PersonaVinculos,
} from "./api";
import type { CommonField } from "@/components/shared/ConfigurableFields";

export type DirectoryResource =
  | "personas"
  | "tipos-cliente"
  | "clientes"
  | "proveedores-persona"
  | "proveedores-sociedad"
  | "empleados"
  | "usuarios";
export interface DirectoryRecord {
  id: string;
  activo: boolean;
  persona_id?: string;
  persona_contacto_id?: string;
  persona?: Persona;
  persona_contacto?: Persona;
  nombre?: string;
  apellido?: string;
  identificacion?: string;
  tipo_identificacion?: string;
  ciudad?: string | null;
  descuento?: string | number;
  razon_social?: string;
  ruc?: string;
  username?: string;
  rol_id?: string;
  rol_nombre?: string;
  requiere_cambio_password?: boolean;
  tiene_codigo_aprobacion?: boolean;
  tipo_cliente_id?: string;
  tipo_contribuyente_id?: string;
  nombre_comercial?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  empresa_id?: string;
  salario?: string;
  fecha_ingreso?: string;
  fecha_nacimiento?: string | null;
  fecha_salida?: string | null;
  foto?: string | null;
  creado_en?: string;
  actualizado_en?: string;
  usuario_auditoria?: string;
}

export interface EffectivePermission {
  codigo: string;
  nombre: string;
  puede_leer: boolean;
  puede_crear: boolean;
  puede_actualizar: boolean;
  puede_eliminar: boolean;
}

export const directoryConfig: Record<
  DirectoryResource,
  {
    title: string;
    singular: string;
    permission: string;
    link?: keyof Pick<
      PersonaVinculos,
      "cliente" | "proveedor_persona" | "empleado" | "usuario"
    >;
    fields: CommonField[];
  }
> = {
  personas: {
    title: "Personas",
    singular: "Persona",
    permission: "PERSONAS",
    fields: [],
  },
  "tipos-cliente": {
    title: "Tipos de Cliente",
    singular: "Tipo de Cliente",
    permission: "TIPOS_CLIENTE",
    fields: [
      { name: "nombre", label: "Nombre", required: true },
      {
        name: "descuento",
        label: "Descuento (%)",
        type: "number",
        min: 0,
        max: 100,
        step: "0.01",
        required: true,
      },
    ],
  },
  clientes: {
    title: "Clientes",
    singular: "Cliente",
    permission: "CLIENTES",
    link: "cliente",
    fields: [],
  },
  "proveedores-persona": {
    title: "Proveedores Persona",
    singular: "Proveedor Persona",
    permission: "PROVEEDORES_PERSONA",
    link: "proveedor_persona",
    fields: [{ name: "nombre_comercial", label: "Nombre comercial" }],
  },
  "proveedores-sociedad": {
    title: "Proveedores Sociedad",
    singular: "Proveedor Sociedad",
    permission: "PROVEEDORES_SOCIEDAD",
    fields: [
      { name: "ruc", label: "RUC Sociedad", required: true },
      { name: "razon_social", label: "Razon social", required: true },
      { name: "nombre_comercial", label: "Nombre comercial" },
      { name: "direccion", label: "Direccion", required: true },
      { name: "telefono", label: "Teléfono" },
      { name: "email", label: "Email", type: "email", required: true },
    ],
  },
  empleados: {
    title: "Empleados",
    singular: "Empleado",
    permission: "EMPLEADOS",
    link: "empleado",
    fields: [
      { name: "salario", label: "Salario", required: true },
      {
        name: "fecha_ingreso",
        label: "Fecha de ingreso",
        type: "date",
        required: true,
      },
      { name: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date" },
      { name: "fecha_salida", label: "Fecha de salida", type: "date" },
      { name: "foto", label: "Foto (URL)", type: "url" },
    ],
  },
  usuarios: {
    title: "Usuarios",
    singular: "Usuario",
    permission: "USUARIOS",
    link: "usuario",
    fields: [],
  },
};

export function buildDirectoryInput(
  resource: DirectoryResource,
  values: Record<string, string>,
  selection: PersonaSelection,
  editing = false,
) {
  const fields = directoryConfig[resource].fields;
  const input: Record<string, unknown> = {};
  for (const field of fields) {
    if (values[field.name] || editing)
      input[field.name] = values[field.name] || null;
  }
  if (resource === "tipos-cliente") input.descuento = values.descuento;
  if (resource === "clientes") input.tipo_cliente_id = values.tipo_cliente_id;
  if (resource === "proveedores-persona" || resource === "proveedores-sociedad")
    input.tipo_contribuyente_id = values.tipo_contribuyente_id;
  if (resource === "empleados") input.empresa_id = values.empresa_id;
  if (resource === "usuarios") {
    input.rol_id = values.rol_id;
    if (!editing) {
      input.username = values.username.trim();
      input.password = values.password;
    }
  }
  if (resource === "empleados" && !editing)
    input.usuario = {
      username: values.username.trim(),
      password: values.password,
      rol_id: values.rol_id,
    };
  if (
    selection.kind !== "none" &&
    resource !== "tipos-cliente" &&
    (!editing || resource === "proveedores-sociedad")
  ) {
    Object.assign(
      input,
      resource === "proveedores-sociedad"
        ? contactReference(selection)
        : personaReference(selection),
    );
  }
  return input;
}

export async function createDirectory(
  resource: DirectoryResource,
  input: object,
) {
  return (await api.post<DirectoryRecord>(`/${resource}`, input)).data;
}

export async function getEffectivePermissions(id: string) {
  return (await api.get<EffectivePermission[]>(`/usuarios/${id}/permisos`))
    .data;
}

export async function resetDirectoryPassword(id: string) {
  return (
    await api.post<{ password_temporal: string }>(
      `/usuarios/${id}/reset-password`,
    )
  ).data.password_temporal;
}

export async function invalidateDirectorySession(id: string) {
  await api.post(`/usuarios/${id}/invalidar-sesion`);
}

interface OpenApiSchema {
  $ref?: string;
  properties?: Record<string, OpenApiSchema>;
  allOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
}
export interface DirectoryOpenApi {
  paths?: Record<
    string,
    {
      post?: {
        requestBody?: { content?: Record<string, { schema?: OpenApiSchema }> };
      };
    }
  >;
  components?: { schemas?: Record<string, OpenApiSchema> };
}
export function supportsComposite(
  document: DirectoryOpenApi,
  resource: DirectoryResource,
) {
  const root =
    document.paths?.[`/api/v1/${resource}`]?.post?.requestBody?.content?.[
      "application/json"
    ]?.schema;
  const expected =
    resource === "proveedores-sociedad"
      ? "persona_contacto_nueva"
      : "persona_nueva";
  const visit = (
    schema: OpenApiSchema | undefined,
    seen: Set<string>,
  ): boolean => {
    if (!schema) return false;
    if (schema.properties?.[expected]) return true;
    if (schema.$ref && !seen.has(schema.$ref)) {
      seen.add(schema.$ref);
      if (
        visit(
          document.components?.schemas?.[schema.$ref.split("/").pop() ?? ""],
          seen,
        )
      )
        return true;
    }
    return [
      ...(schema.allOf ?? []),
      ...(schema.anyOf ?? []),
      ...(schema.oneOf ?? []),
    ].some((part) => visit(part, seen));
  };
  return visit(root, new Set());
}
export async function getDirectoryOpenApi() {
  return (await api.get<DirectoryOpenApi>("/personas/contrato")).data;
}
