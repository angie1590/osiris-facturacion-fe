import api from "@/lib/api";

export interface Categoria {
  id: string;
  nombre: string;
  es_padre: boolean;
  is_default: boolean;
  parent_id: string | null;
  activo: boolean;
}

export interface ProductoPendienteRecategorizacion {
  producto_id: string;
  nombre: string;
  codigo_barras: string | null;
  categoria_id: string;
  categoria_nombre: string;
  padre_id: string | null;
  padre_nombre: string | null;
}

export async function getConteoSinRecategorizar() {
  const response = await api.get<{ count: number }>("/categorias/sin-clasificar/conteo");
  return response.data.count;
}

export async function getProductosSinRecategorizar() {
  const response = await api.get<ProductoPendienteRecategorizacion[]>("/categorias/sin-clasificar/productos");
  return response.data;
}

export async function recategorizarProductos(assignments: { producto_id: string; categoria_id: string }[]) {
  const response = await api.post<{ recategorized: number }>("/categorias/recategorizar", { assignments });
  return response.data;
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

export async function updateCategoria(
  id: string,
  input: Partial<Parameters<typeof createCategoria>[0]> & { confirmar_limpieza_colision?: boolean },
) {
  const response = await api.put<Categoria>(`/categorias/${id}`, input);
  return response.data;
}

export async function deleteCategoria(id: string, confirmarBajaProductos = false) {
  await api.delete(`/categorias/${id}`, {
    params: { confirmar_baja_productos: confirmarBajaProductos },
  });
}
