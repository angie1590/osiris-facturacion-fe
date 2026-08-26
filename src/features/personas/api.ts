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
