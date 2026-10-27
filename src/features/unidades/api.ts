import api from "@/lib/api";

export interface Unidad {
  id: string;
  codigo: string;
  nombre: string;
  simbolo: string;
  magnitud_codigo: string;
  es_sistema: boolean;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
  uso: {
    atributos_activos: number;
    atributos_inactivos: number;
    snapshots_historicos: number;
  };
}

export type UnidadInput = Pick<Unidad, "codigo" | "nombre" | "simbolo" | "magnitud_codigo">;

export interface UnidadPage {
  items: Unidad[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    page_count: number;
  };
}

export interface UnidadFilters {
  q?: string;
  magnitud_codigo?: string;
  only_active: boolean;
  limit: number;
  offset: number;
}

export async function listarUnidades(filters: UnidadFilters): Promise<UnidadPage> {
  return (await api.get<UnidadPage>("/unidades", { params: filters })).data;
}

export async function crearUnidad(input: UnidadInput): Promise<Unidad> {
  return (await api.post<Unidad>("/unidades", input)).data;
}

export async function actualizarUnidad(id: string, input: UnidadInput): Promise<Unidad> {
  return (await api.put<Unidad>(`/unidades/${id}`, input)).data;
}

export async function desactivarUnidad(id: string): Promise<Unidad> {
  return (await api.delete<Unidad>(`/unidades/${id}`)).data;
}

export async function reactivarUnidad(id: string): Promise<Unidad> {
  return (await api.post<Unidad>(`/unidades/${id}/reactivar`)).data;
}