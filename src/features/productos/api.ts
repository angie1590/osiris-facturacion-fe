import api from "@/lib/api";

export interface ProductoListado {
  id: string;
  nombre: string;
  tipo: "BIEN" | "SERVICIO";
  pvp: string;
  cantidad: string;
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
