import api from "@/lib/api";

export interface VentaListItem {
  id: string;
  numero_factura: string | null;
  cliente: string;
  estado: string;
  estado_sri: string;
  fecha_emision: string;
  valor_total: string;
}

export interface VentaDetalle {
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  subtotal_sin_impuesto: string;
}

export interface Venta {
  id: string;
  secuencial_formateado: string | null;
  fecha_emision: string;
  cliente_id: string | null;
  identificacion_comprador: string;
  forma_pago: string;
  tipo_emision: string;
  estado: string;
  estado_sri: string;
  subtotal_sin_impuestos: string;
  monto_iva: string;
  valor_total: string;
  detalles: VentaDetalle[];
}

export interface VentaDesdeProductosInput {
  cliente_id?: string;
  punto_emision_id?: string;
  bodega_id?: string;
  tipo_identificacion_comprador: string;
  identificacion_comprador: string;
  forma_pago: string;
  usuario_auditoria: string;
  detalles: Array<{
    producto_id: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

export interface CuentaPorCobrar {
  id: string;
  venta_id: string;
  cliente_id: string | null;
  cliente: string;
  numero_factura: string | null;
  fecha_emision: string;
  valor_total_factura: string;
  valor_retenido: string;
  pagos_acumulados: string;
  saldo_pendiente: string;
  estado: string;
}

export interface PagoCuentaPorCobrarInput {
  monto: number;
  fecha: string;
  forma_pago_sri: string;
  usuario_auditoria: string;
}

export async function getVentas() {
  const response = await api.get<{ items: VentaListItem[] }>("/ventas", {
    params: { limit: 1000, offset: 0, only_active: true },
  });
  return response.data.items;
}

export async function getVenta(id: string) {
  const response = await api.get<Venta>(`/ventas/${id}`);
  return response.data;
}

export async function createVenta(input: VentaDesdeProductosInput) {
  const response = await api.post(
    "/ventas/desde-productos?emitir_automaticamente=false",
    input,
  );
  return response.data;
}

export async function emitVenta(id: string) {
  const response = await api.post(`/ventas/${id}/emitir`, {
    usuario_auditoria: "frontend",
  });
  return response.data;
}

export async function cancelVenta(id: string, motivo?: string) {
  const response = await api.post(`/ventas/${id}/anular`, {
    usuario_auditoria: "frontend",
    confirmado_portal_sri: true,
    motivo: motivo || undefined,
  });
  return response.data;
}

export async function downloadVentaDocument(id: string, kind: "xml" | "ride") {
  return api.get(`/documentos/${id}/${kind}`, { responseType: "blob" });
}

export async function getCuentasPorCobrar(texto = "") {
  const response = await api.get<{ items: CuentaPorCobrar[] }>("/cxc", {
    params: {
      limit: 500,
      offset: 0,
      only_active: true,
      texto: texto || undefined,
    },
  });
  return response.data.items;
}

export async function createPagoCuentaPorCobrar(
  ventaId: string,
  input: PagoCuentaPorCobrarInput,
) {
  const response = await api.post(`/cxc/${ventaId}/pagos`, input);
  return response.data;
}