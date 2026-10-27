import api from "@/lib/api";

export interface Categoria {
  id: string;
  nombre: string;
  es_padre: boolean;
  is_default: boolean;
  parent_id: string | null;
  activo: boolean;
}

export interface CategoriaArbol extends Categoria {
  tiene_hijos: boolean;
  atributos_propios_count: number;
  atributos_efectivos_count: number;
  hijos: CategoriaArbol[];
}

export interface CategoriaWrite {
  nombre: string;
  parent_id?: string | null;
  confirmar_limpieza_colision?: boolean;
}

export interface CategoriaAtributoEfectivo {
  mapping_id: string;
  atributo_id: string;
  codigo: string;
  nombre: string;
  tipo_dato: string;
  unidad: {
    id: string;
    codigo: string;
    nombre: string;
    simbolo: string;
    magnitud_codigo: string;
  } | null;
  restricciones: {
    allow_negative: boolean;
    min_value: number | string | null;
    max_value: number | string | null;
  };
  select_options: string[] | null;
  catalog_id: string | null;
  obligatorio: boolean;
  valor_default: string | number | boolean | null;
  orden: number | null;
  categoria_origen: { id: string; nombre: string };
  profundidad: number;
  heredado: boolean;
}

export interface B3Preview {
  operacion: string;
  resumen: string;
  conteos: { productos_directos?: number; [key: string]: number | undefined };
  requiere_confirmacion: boolean;
  acciones_permitidas: string[];
  precondicion_preview: string;
}

export interface CategoriaAtributoPreview {
  operacion: string;
  resumen: string;
  conteos: Record<string, number>;
  faltantes: { id: string; nombre: string; motivo: string }[];
  remapeos?: { id: string; nombre: string; motivo: string }[];
  requiere_confirmacion: boolean;
  acciones_permitidas: string[];
  precondicion_preview: string;
}

export interface CategoryAttributeCreatePayload {
  categoria_id: string;
  nombre: string;
  tipo_dato: string;
  select_options?: string[];
  catalog_id?: string;
  allow_negative?: boolean;
  min_value?: number;
  max_value?: number;
  obligatorio: boolean;
  valor_default: string | null;
  aplicar_default_a_existentes: boolean;
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

function adaptCanonicalTreeNodeForLegacyConsumers(
  node: Omit<CategoriaArbol, "es_padre" | "activo">,
): CategoriaArbol {
  const hijos = node.hijos.map(adaptCanonicalTreeNodeForLegacyConsumers);
  return {
    ...node,
    es_padre: node.tiene_hijos,
    activo: true,
    hijos,
  };
}

export async function getCategoriasArbol(): Promise<CategoriaArbol[]> {
  const response = await api.get<Omit<CategoriaArbol, "es_padre" | "activo">[]>(
    "/categorias/arbol",
  );
  return response.data.map(adaptCanonicalTreeNodeForLegacyConsumers);
}

export async function getCategoriaAtributosEfectivos(
  categoriaId: string,
): Promise<CategoriaAtributoEfectivo[]> {
  return (
    await api.get<CategoriaAtributoEfectivo[]>(
      `/categorias/${categoriaId}/atributos-efectivos`,
    )
  ).data;
}

export async function getCategoriaAtributosPropios(
  categoriaId: string,
): Promise<CategoriaAtributoEfectivo[]> {
  return (
    await api.get<CategoriaAtributoEfectivo[]>(
      `/categorias/${categoriaId}/atributos-propios`,
    )
  ).data;
}

export async function assignExistingAttribute(
  categoriaId: string,
  input: {
    atributo_id: string;
    obligatorio?: boolean;
    valor_default?: string | null;
    orden?: number | null;
    aplicar_default_a_existentes?: boolean;
    precondicion_preview?: string;
  },
): Promise<CategoriaAtributoEfectivo> {
  return (
    await api.post<CategoriaAtributoEfectivo>(
      `/categorias/${categoriaId}/atributos`,
      input,
    )
  ).data;
}

export async function previewCategoriaAtributo(
  categoriaId: string,
  mappingId: string | null,
  input: {
    atributo_id?: string;
    obligatorio: boolean;
    valor_default: string | null;
    orden: number | null;
    aplicar_default_a_existentes: boolean;
  },
): Promise<CategoriaAtributoPreview> {
  const path = mappingId
    ? `/categorias/${categoriaId}/atributos/${mappingId}/previsualizar`
    : `/categorias/${categoriaId}/atributos/previsualizar`;
  return (await api.post<CategoriaAtributoPreview>(path, input)).data;
}

export async function previewCreateCategoryAttribute(
  input: CategoryAttributeCreatePayload,
): Promise<CategoriaAtributoPreview> {
  return (
    await api.post<CategoriaAtributoPreview>("/atributos/previsualizar", input)
  ).data;
}

export async function previewRemoveCategoriaAtributo(
  categoriaId: string,
  mappingId: string,
): Promise<CategoriaAtributoPreview> {
  return (
    await api.post<CategoriaAtributoPreview>(
      `/categorias/${categoriaId}/atributos/${mappingId}/previsualizar-remocion`,
    )
  ).data;
}

export async function removeCategoriaAtributo(
  categoriaId: string,
  mappingId: string,
  precondition: string,
): Promise<{ mapping_id: string; valores_desactivados: number }> {
  return (
    await api.delete<{ mapping_id: string; valores_desactivados: number }>(
      `/categorias/${categoriaId}/atributos/${mappingId}`,
      { data: { confirmar: true, precondicion_preview: precondition } },
    )
  ).data;
}

export async function createCategoria(input: CategoriaWrite) {
  const response = await api.post<Categoria>("/categorias", input);
  return response.data;
}

export async function updateCategoria(
  id: string,
  input: Partial<CategoriaWrite>,
) {
  const response = await api.put<Categoria>(`/categorias/${id}`, input);
  return response.data;
}

export async function previewCategoryCreate(input: CategoriaWrite) {
  return (
    await api.post<B3Preview>("/categorias/previsualizar", input)
  ).data;
}

export async function previewCategoryMove(id: string, input: CategoriaWrite) {
  return (
    await api.post<B3Preview>(`/categorias/${id}/previsualizar`, input)
  ).data;
}

export async function confirmCategoryCreate(
  payload: CategoriaWrite,
  precondicion_preview: string,
) {
  return (
    await api.post<Categoria>("/categorias", {
      payload,
      confirmar_b3: true,
      precondicion_preview,
    })
  ).data;
}

export async function confirmCategoryMove(
  id: string,
  payload: CategoriaWrite,
  precondicion_preview: string,
) {
  return (
    await api.put<Categoria>(`/categorias/${id}`, {
      payload,
      confirmar_b3: true,
      precondicion_preview,
    })
  ).data;
}

export async function deleteCategoria(id: string, confirmarBajaProductos = false) {
  await api.delete(`/categorias/${id}`, {
    params: { confirmar_baja_productos: confirmarBajaProductos },
  });
}
