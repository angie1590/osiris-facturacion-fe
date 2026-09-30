import api from "@/lib/api";

export interface CompraListItem {
  id: string;
  proveedor_id: string;
  secuencial_factura: string;
  fecha_emision: string;
  identificacion_proveedor: string;
  valor_total: string;
  estado: string;
}

export interface CompraDetalleInput {
  producto_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export interface CompraDesdeProductosInput {
  proveedor_id: string;
  secuencial_factura: string;
  autorizacion_sri: string;
  fecha_emision: string;
  bodega_id?: string;
  sustento_tributario: string;
  tipo_identificacion_proveedor: string;
  identificacion_proveedor: string;
  forma_pago: string;
  usuario_auditoria: string;
  detalles: CompraDetalleInput[];
}

export interface RetencionLineaInput {
  codigo_retencion_sri: string;
  tipo: "RENTA" | "IVA";
  porcentaje: number;
  base_calculo: number;
}

export interface RetencionSugerida {
  compra_id: string;
  detalles: Array<{
    codigo_retencion_sri: string;
    tipo: "RENTA" | "IVA";
    porcentaje: string;
    base_calculo: string;
  }>;
  total_retenido: string;
}

export interface RetencionCreateInput {
  fecha_emision: string;
  usuario_auditoria: string;
  detalles: RetencionLineaInput[];
}

export async function getCompras(onlyActive = false) {
  const response = await api.get<{ items: CompraListItem[] }>("/compras", {
    params: { limit: 1000, offset: 0, only_active: onlyActive },
  });
  return response.data.items;
}

export async function createCompra(input: CompraDesdeProductosInput) {
  const response = await api.post<CompraListItem>(
    "/compras/desde-productos",
    input,
  );
  return response.data;
}

export async function getRetencionSugerida(compraId: string) {
  const response = await api.get<RetencionSugerida>(
    `/compras/${compraId}/sugerir-retencion`,
  );
  return response.data;
}

export async function createRetencion(
  compraId: string,
  input: RetencionCreateInput,
) {
  const response = await api.post(`/compras/${compraId}/retenciones`, input);
  return response.data;
}