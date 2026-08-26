import api from "@/lib/api";
import type { Persona } from "@/types/api";

export type PersonaTipo = Persona["tipo"];

export interface PersonaCreateInput {
  tipo: PersonaTipo;
  identificacion: string;
  razon_social: string;
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
