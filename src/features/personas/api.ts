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

interface PaginatedResponse<T> {
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
  usuario_auditoria: string;
}

export interface TipoCliente {
  id: string;
  nombre: string;
  descuento: number;
}

export interface Cliente {
  id: string;
  persona_id: string;
  tipo_cliente_id: string;
  activo: boolean;
}

export interface ProveedorPersona {
  id: string;
  persona_id: string;
  nombre_comercial: string | null;
  tipo_contribuyente_id: string;
  activo: boolean;
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
}

export async function getPersonas(offset = 0, limit = 50) {
  const response = await api.get<PaginatedResponse<Persona>>("/personas", {
    params: { offset, limit, only_active: true },
  });
  return response.data;
}

export async function createPersona(input: PersonaCreateInput) {
  const response = await api.post<Persona>("/personas", input);
  return response.data;
}

export async function getTiposCliente() {
  const response = await api.get<{ items: TipoCliente[] }>("/tipos-cliente");
  return response.data.items;
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

export async function createCliente(personaId: string, tipoClienteId: string) {
  const response = await api.post("/clientes", {
    persona_id: personaId,
    tipo_cliente_id: tipoClienteId,
  });
  return response.data;
}

export async function createProveedorPersona(
  personaId: string,
  tipoContribuyenteId: string,
  nombreComercial?: string,
) {
  const response = await api.post("/proveedores-persona", {
    persona_id: personaId,
    tipo_contribuyente_id: tipoContribuyenteId,
    nombre_comercial: nombreComercial || undefined,
  });
  return response.data;
}

export interface ProveedorSociedadInput {
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion: string;
  telefono: string;
  email: string;
  tipo_contribuyente_id: string;
  persona_contacto_id: string;
  usuario_auditoria: string;
}

export async function createProveedorSociedad(input: ProveedorSociedadInput) {
  const response = await api.post("/proveedores-sociedad", input);
  return response.data;
}
