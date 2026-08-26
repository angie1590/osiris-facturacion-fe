import api from "@/lib/api";
import axios from "axios";
import type { Persona } from "@/types/api";

export type PersonaTipo = Persona["tipo"];

export interface PersonaCreateInput {
  tipo: PersonaTipo;
  identificacion: string;
  razon_social: string;
  nombre_comercial?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export async function getPersonas(tipo: PersonaTipo) {
  const response = await api.get<Persona[]>(`/personas/${tipo}`);
  return response.data;
}

export async function createPersona(input: PersonaCreateInput) {
  const response = await api.post<Persona>("/personas", {
    ...input,
    identificacion_tipo: "ruc",
  });
  return response.data;
}

export async function searchPersona(identificacion: string) {
  try {
    const response = await api.get<Persona>(
      `/personas/buscar/${encodeURIComponent(identificacion)}`,
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}
