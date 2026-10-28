import api from "@/lib/api";

export interface ProductoListado {
  id: string;
  nombre: string;
  tipo: "BIEN" | "SERVICIO";
  pvp: string;
  cantidad: string;
  categoria_principal?: CategoriaOption | null;
  categoria_ruta?: CategoriaOption[];
  categorias?: CategoriaOption[];
}

export interface CategoriaOption {
  id: string;
  nombre: string;
}

export interface ImpuestoOption {
  id: string;
  tipo_impuesto: "IVA" | "ICE" | "IRBPNR";
  descripcion: string;
  codigo_sri: string;
  porcentaje_iva?: string | null;
  tarifa_ad_valorem?: string | null;
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

export type ProductoAtributoScalar = string | number | boolean | null;

export interface ProductoAtributoUnidad {
  id: string;
  codigo: string;
  nombre: string;
  simbolo: string;
  magnitud_codigo: string;
}

export interface ProductoAtributoRestricciones {
  allow_negative: boolean;
  min_value?: string | number | null;
  max_value?: string | number | null;
}

export interface ProductoAtributoValue {
  atributo: ProductoAtributoDetail;
  valor: ProductoAtributoScalar;
  obligatorio?: boolean | null;
  orden?: number | null;
}

export interface ProductoAtributoDetail {
  id: string;
  codigo?: string | null;
  nombre: string;
  tipo_dato: string;
  unidad_id?: string | null;
  unidad?: ProductoAtributoUnidad | null;
  restricciones?: ProductoAtributoRestricciones | null;
  select_options?: string[] | null;
  catalog_id?: string | null;
  allow_negative?: boolean;
  min_value?: string | number | null;
  max_value?: string | number | null;
  categoria_origen_id?: string | null;
  categoria_origen?: CategoriaOption | null;
  heredado?: boolean;
}

export interface ProductoAtributoEfectivo {
  atributo_id: string;
  codigo: string;
  nombre: string;
  tipo_dato: string;
  unidad_id: string | null;
  unidad: ProductoAtributoUnidad | null;
  restricciones: ProductoAtributoRestricciones;
  select_options?: string[] | null;
  catalog_id?: string | null;
  obligatorio: boolean;
  valor_default?: string | number | boolean | null;
  orden?: number | null;
  categoria_origen: CategoriaOption;
  profundidad: number;
  heredado: boolean;
}

export interface ProductoIntegralAttributeInput {
  atributo_id: string;
  valor: ProductoAtributoScalar;
}

export interface ProductoIntegralCreateInput {
  nombre: string;
  descripcion?: string | null;
  codigo_barras?: string | null;
  tipo: "BIEN" | "SERVICIO";
  pvp: number;
  permite_fracciones?: boolean;
  casa_comercial_id?: string | null;
  categoria_principal_id: string;
  impuesto_catalogo_ids: string[];
  atributos: ProductoIntegralAttributeInput[];
}

export interface ProductoIntegralUpdateInput {
  nombre?: string | null;
  descripcion?: string | null;
  codigo_barras?: string | null;
  tipo?: "BIEN" | "SERVICIO" | null;
  pvp?: number | null;
  permite_fracciones?: boolean | null;
  casa_comercial_id?: string | null;
  categoria_principal_id: string;
  impuesto_catalogo_ids?: string[] | null;
  atributos?: ProductoIntegralAttributeInput[] | null;
  precondicion_preview?: string | null;
}

export interface ProductoCambioCategoriaImpacto {
  atributo_id: string;
  codigo: string;
  nombre: string;
  valor?: ProductoAtributoScalar;
  motivo: string;
}

export interface ProductoCambioCategoriaPreview {
  operacion: string;
  producto_id: string;
  categoria_actual_id: string | null;
  categoria_actual_ruta: string | null;
  categoria_destino_id: string;
  categoria_destino_ruta: string;
  resumen: string;
  conteos: Record<string, number>;
  conservados: ProductoCambioCategoriaImpacto[];
  desactivados: ProductoCambioCategoriaImpacto[];
  defaults: ProductoCambioCategoriaImpacto[];
  faltantes: ProductoCambioCategoriaImpacto[];
  incompatibles: ProductoCambioCategoriaImpacto[];
  requiere_confirmacion: boolean;
  acciones_permitidas: string[];
  precondicion_preview: string;
}

export interface ProveedorPersonaProducto {
  id: string;
  nombres: string;
  apellidos: string;
  nombre_comercial: string | null;
}

export interface ProveedorSociedadProducto {
  id: string;
  razon_social: string;
  nombre_comercial: string | null;
}

export interface ProductoImpuestoDetalle {
  id: string;
  tipo_impuesto: "IVA" | "ICE" | "IRBPNR";
  nombre: string;
  codigo: string;
  porcentaje: string;
}

export interface ProductoDetalle {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigo_barras: string | null;
  tipo: "BIEN" | "SERVICIO";
  pvp: string;
  cantidad: string;
  permite_fracciones: boolean;
  categoria_principal: CategoriaOption | null;
  categoria_ruta: CategoriaOption[];
  categorias: CategoriaOption[];
  atributos: ProductoAtributoValue[];
  bodegas: BodegaStock[];
  proveedores_persona: ProveedorPersonaProducto[];
  proveedores_sociedad: ProveedorSociedadProducto[];
  impuestos: ProductoImpuestoDetalle[];
}

export interface BodegaStock {
  id: string;
  bodega_id: string;
  codigo_bodega: string;
  nombre_bodega: string;
  cantidad: number | string;
}

export interface BodegaOption {
  id: string;
  codigo_bodega: string;
  nombre_bodega: string;
}

export interface ProveedorPersonaOption { id: string; nombre_comercial: string | null; persona_id: string; }
export interface ProveedorSociedadOption { id: string; razon_social: string; nombre_comercial: string | null; }

export interface CategoriaAtributo {
  atributo_id: string;
  orden: number | null;
  obligatorio: boolean | null;
  valor_default: string | null;
}

export interface CatalogoValorOption {
  id: string;
  catalog_id: string;
  value: string;
  is_active: boolean;
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

export async function getCategoriasSeleccionables() {
  const response = await api.get<CategoriaOption[]>("/categorias/seleccionables");
  return response.data;
}

export async function getAtributosEfectivos(categoriaId: string) {
  const response = await api.get<ProductoAtributoEfectivo[]>(
    `/categorias/${categoriaId}/atributos-efectivos`,
  );
  return response.data;
}

export async function getImpuestosActivos() {
  const response = await api.get<{ items: ImpuestoOption[] }>("/impuestos/activos-vigentes", {
    params: { limit: 1000, offset: 0 },
  });
  return response.data.items;
}

export async function getImpuestosPermitidos(tipo: "BIEN" | "SERVICIO") {
  const response = await api.get<ImpuestoOption[]>("/productos/impuestos-disponibles", {
    params: { tipo_producto: tipo },
  });
  return response.data;
}

export async function getValoresCatalogo(catalogId: string) {
  const response = await api.get<CatalogoValorOption[]>(`/catalogos/${catalogId}/valores`, {
    params: { include_inactive: false },
  });
  return response.data;
}

export async function createProducto(input: ProductoCreateInput) {
  const response = await api.post<{ id: string }>("/productos", input);
  return response.data;
}

export async function createProductoIntegral(input: ProductoIntegralCreateInput) {
  const response = await api.post<ProductoDetalle>("/productos", input);
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

export async function updateProductoIntegral(
  id: string,
  input: ProductoIntegralUpdateInput,
) {
  const response = await api.put<ProductoDetalle>(`/productos/${id}`, input);
  return response.data;
}

export async function previewCambioCategoriaProducto(
  id: string,
  input: {
    categoria_principal_id: string;
    atributos: ProductoIntegralAttributeInput[];
  },
) {
  const response = await api.post<ProductoCambioCategoriaPreview>(
    `/productos/${id}/previsualizar-cambio-categoria`,
    input,
  );
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

export async function getProveedoresPersona() {
  const response = await api.get<{ items: ProveedorPersonaOption[] }>("/proveedores-persona", { params: { limit: 1000, offset: 0, only_active: true } });
  return response.data.items;
}

export async function getProveedoresSociedad() {
  const response = await api.get<{ items: ProveedorSociedadOption[] }>("/proveedores-sociedad", { params: { limit: 1000, offset: 0, only_active: true } });
  return response.data.items;
}

export async function saveProductoProveedores(productoId: string, type: "persona" | "sociedad", providerIds: string[]) {
  await api.put(`/productos/${productoId}/proveedores-${type}`, { proveedor_ids: providerIds });
}
