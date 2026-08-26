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
  const response = await api.post("/productos", input);
  return response.data;
}
