import api from "@/lib/api";

export type TipoIdentificacion = "CEDULA" | "RUC" | "PASAPORTE";

export interface Persona {
  id: string;
  identificacion: string;
  tipo_identificacion: TipoIdentificacion;
  nombre: string;
  apellido: string;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  email: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: { total: number; limit: number; offset: number };
}

export interface PersonaCreateInput {
  identificacion: string;
  tipo_identificacion: TipoIdentificacion;
  nombre: string;
  apellido: string;
  direccion?: string;
  telefono?: string;
  ciudad?: string;
  email?: string;
}

export interface PersonaUpdateInput {
  identificacion: string;
  tipo_identificacion: TipoIdentificacion;
  nombre: string;
  apellido: string;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  email: string | null;
}

export interface TipoCliente {
  id: string;
  nombre: string;
  descuento: number;
  activo?: boolean;
}

export interface TipoContribuyente {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  aplica_persona_natural: boolean;
  aplica_sociedad: boolean;
  activo: boolean;
}

export interface Cliente {
  id: string;
  persona_id: string;
  tipo_cliente_id: string;
  activo: boolean;
  persona?: Persona;
}

export interface ProveedorPersona {
  id: string;
  persona_id: string;
  nombre_comercial: string | null;
  tipo_contribuyente_id: string;
  activo: boolean;
  persona?: Persona;
}

export interface ProveedorSociedad {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  direccion: string;
  telefono: string | null;
  email: string;
  tipo_contribuyente_id: string;
  persona_contacto_id: string;
  activo: boolean;
  persona_contacto?: Persona;
}

export interface DirectoryParams {
  offset?: number;
  limit?: number;
  only_active?: boolean;
  estado?: "activo" | "inactivo";
  q?: string;
  identificacion?: string;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
}

export type PersonaSelection =
  | { kind: "none" }
  | { kind: "existing"; persona: Persona }
  | { kind: "new"; borradorPersona: PersonaCreateInput };

export type PersonaReference =
  | { persona_id: string; persona_nueva?: never }
  | { persona_nueva: PersonaCreateInput; persona_id?: never };
export type ContactReference =
  | { persona_contacto_id: string; persona_contacto_nueva?: never }
  | { persona_contacto_nueva: PersonaCreateInput; persona_contacto_id?: never };

export function personaReference(
  value: Exclude<PersonaSelection, { kind: "none" }>,
): PersonaReference {
  return value.kind === "existing"
    ? { persona_id: value.persona.id }
    : { persona_nueva: value.borradorPersona };
}

export function contactReference(
  value: Exclude<PersonaSelection, { kind: "none" }>,
): ContactReference {
  return value.kind === "existing"
    ? { persona_contacto_id: value.persona.id }
    : { persona_contacto_nueva: value.borradorPersona };
}

export function normalizeIdentification(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export async function getPersonas(
  offset = 0,
  limit = 50,
  onlyActive = true,
  filters: DirectoryParams = {},
  signal?: AbortSignal,
) {
  const response = await api.get<PaginatedResponse<Persona>>("/personas", {
    params: { offset, limit, only_active: onlyActive, ...filters },
    ...(signal ? { signal } : {}),
  });
  return response.data;
}

export async function createPersona(input: PersonaCreateInput) {
  const response = await api.post<Persona>("/personas", input);
  return response.data;
}

export async function updatePersona(id: string, input: PersonaUpdateInput) {
  const response = await api.put<Persona>(`/personas/${id}`, input);
  return response.data;
}

export async function setPersonaActive(id: string, active: boolean) {
  if (!active) {
    await api.delete(`/personas/${id}`);
    return;
  }
  const response = await api.post<Persona>(`/personas/${id}/reactivar`);
  return response.data;
}

export async function getTiposCliente() {
  const response = await api.get<{ items: TipoCliente[] }>("/tipos-cliente");
  return response.data.items;
}

export async function getTiposContribuyente() {
  const response = await api.get<TipoContribuyente[]>("/tipos-contribuyente");
  return response.data;
}

async function getPaginated<T>(path: string) {
  const response = await api.get<{ items: T[] }>(path, {
    params: { limit: 1000, offset: 0, only_active: true },
  });
  return response.data.items;
}

export const getClientes = () => getPaginated<Cliente>("/clientes");
export const getProveedoresPersona = () =>
  getPaginated<ProveedorPersona>("/proveedores-persona");
export const getProveedoresSociedad = () =>
  getPaginated<ProveedorSociedad>("/proveedores-sociedad");

export async function createCliente(
  personaId: string | PersonaReference,
  tipoClienteId: string,
) {
  const response = await api.post<Cliente>("/clientes", {
    ...(typeof personaId === "string" ? { persona_id: personaId } : personaId),
    tipo_cliente_id: tipoClienteId,
  });
  return response.data;
}

export async function createProveedorPersona(
  personaId: string | PersonaReference,
  tipoContribuyenteId: string,
  nombreComercial?: string,
) {
  const response = await api.post("/proveedores-persona", {
    ...(typeof personaId === "string" ? { persona_id: personaId } : personaId),
    tipo_contribuyente_id: tipoContribuyenteId,
    nombre_comercial: nombreComercial || undefined,
  });
  return response.data;
}

export type ProveedorSociedadInput = ContactReference & {
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion: string;
  telefono?: string;
  email: string;
  tipo_contribuyente_id: string;
};

export async function createProveedorSociedad(input: ProveedorSociedadInput) {
  const response = await api.post("/proveedores-sociedad", input);
  return response.data;
}

export interface PersonaVinculos {
  persona_id: string;
  cliente: { id: string; activo: boolean } | null;
  proveedor_persona: { id: string; activo: boolean } | null;
  empleado: { id: string; activo: boolean } | null;
  usuario: { id: string; activo: boolean } | null;
  proveedores_sociedad: Array<{
    id: string;
    activo: boolean;
    razon_social: string;
  }>;
  dependencias_activas: Array<{ recurso: string; id: string; nombre: string }>;
}

export async function getPersona(id: string, signal?: AbortSignal) {
  return (await api.get<Persona>(`/personas/${id}`, { signal })).data;
}

export async function getPersonaVinculos(id: string, signal?: AbortSignal) {
  return (
    await api.get<PersonaVinculos>(`/personas/${id}/vinculos`, { signal })
  ).data;
}

export async function getDirectory<T>(
  resource: string,
  params: DirectoryParams,
  signal?: AbortSignal,
) {
  return (
    await api.get<PaginatedResponse<T>>(`/${resource}`, { params, signal })
  ).data;
}

export async function updateDirectory<T>(
  resource: string,
  id: string,
  input: object,
) {
  return (await api.put<T>(`/${resource}/${id}`, input)).data;
}

export async function setDirectoryActive(
  resource: string,
  id: string,
  active: boolean,
) {
  if (active) return (await api.post(`/${resource}/${id}/reactivar`)).data;
  await api.delete(`/${resource}/${id}`);
}
