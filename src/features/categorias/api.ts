import api from "@/lib/api";

export interface Categoria {
  id: string;
  nombre: string;
  es_padre: boolean;
  parent_id: string | null;
  activo: boolean;
}

export async function getCategoriasCanonicas() {
  const response = await api.get<{ items: Categoria[] }>("/categorias", {
    params: { limit: 1000, offset: 0, only_active: true },
  });
  return response.data.items;
}

export async function createCategoria(input: {
  nombre: string;
  es_padre: boolean;
  parent_id?: string;
  usuario_auditoria: string;
}) {
  const response = await api.post<Categoria>("/categorias", input);
  return response.data;
}
