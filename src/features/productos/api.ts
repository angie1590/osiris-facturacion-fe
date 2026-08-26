import api from "@/lib/api";

export interface ProductoListado {
  id: string;
  nombre: string;
  tipo: "BIEN" | "SERVICIO";
  pvp: string;
  cantidad: string;
}

export interface CategoriaOption {
  id: string;
  nombre: string;
}

export interface ImpuestoOption {
  id: string;
  descripcion: string;
  codigo_sri: string;
  porcentaje_iva?: string | null;
}

export interface ProductoCreateInput {
  nombre: string;
  descripcion?: string;
  codigo_barras?: string;
  tipo: "BIEN" | "SERVICIO";
  pvp: number;
  categoria_ids?: string[];
  impuesto_catalogo_ids: string[];
  usuario_auditoria: string;
}

export interface ProductoAtributoValue {
  atributo: { id?: string; nombre: string; tipo_dato?: string | null };
  valor: string | number | boolean | null;
}

export interface ProveedorPersonaProducto {
  nombres: string;
  apellidos: string;
  nombre_comercial: string | null;
}

export interface ProveedorSociedadProducto {
  razon_social: string;
  nombre_comercial: string | null;
}

export interface ProductoDetalle extends ProductoCreateInput {
  id: string;
  cantidad: string;
  permite_fracciones: boolean;
  atributos: ProductoAtributoValue[];
  bodegas: BodegaStock[];
  proveedores_persona: ProveedorPersonaProducto[];
  proveedores_sociedad: ProveedorSociedadProducto[];
}

export interface BodegaStock {
  id: string;
  bodega_id: string;
  codigo_bodega: string;
  nombre_bodega: string;
  cantidad: number;
}

export interface BodegaOption {
  id: string;
  codigo_bodega: string;
  nombre_bodega: string;
}

export interface CategoriaAtributo {
  atributo_id: string;
  orden: number | null;
  obligatorio: boolean | null;
  valor_default: string | null;
}

interface ProductPage {
  items: ProductoListado[];
  meta: { total: number; limit: number; offset: number; page: number; page_count: number };
}

export async function getProductos(offset = 0, limit = 50) {
  const response = await api.get<ProductPage>("/productos", {
    params: { offset, limit, only_active: true },
  });
  return response.data;
}

export async function getCategorias() {
  const response = await api.get<{ items: CategoriaOption[] }>("/categorias", {
    params: { limit: 1000, offset: 0, only_active: true },
  });
  return response.data.items;
}

export async function getImpuestosActivos() {
  const response = await api.get<{ items: ImpuestoOption[] }>("/impuestos/activos-vigentes", {
    params: { limit: 1000, offset: 0 },
  });
  return response.data.items;
}

export async function createProducto(input: ProductoCreateInput) {
  const response = await api.post<{ id: string }>("/productos", input);
  return response.data;
}

export async function getProducto(id: string) {
  const response = await api.get<ProductoDetalle>(`/productos/${id}`);
  return response.data;
}

export async function updateProducto(id: string, input: Partial<ProductoCreateInput>) {
  const response = await api.put(`/productos/${id}`, { ...input, usuario_auditoria: "frontend" });
  return response.data;
}

export async function getAtributosDeCategoria(categoriaId: string) {
  const response = await api.get<CategoriaAtributo[]>("/categorias-atributos", {
    params: { categoria_id: categoriaId, limit: 1000 },
  });
  return response.data;
}

export async function saveValoresProducto(productoId: string, values: { atributo_id: string; valor: unknown }[]) {
  await api.put(`/productos/${productoId}/atributos`, values);
}

export async function getBodegas() {
  const response = await api.get<BodegaOption[]>("/bodegas", { params: { limit: 200, skip: 0 } });
  return response.data;
}

export async function saveProductoBodega(productoId: string, bodegaId: string, cantidad: number, exists: boolean) {
  const method = exists ? "put" : "post";
  await api[method](`/productos/${productoId}/bodegas/${bodegaId}`, {
    cantidad,
    usuario_auditoria: "frontend",
  });
}
