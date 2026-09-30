import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelVenta,
  createPagoCuentaPorCobrar,
  createVenta,
  downloadVentaDocument,
  emitVenta,
  getVenta,
  getVentas,
  getCuentasPorCobrar,
  type VentaDesdeProductosInput,
} from "./api";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: { get, post },
}));

describe("ventas api", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("lista únicamente ventas activas", async () => {
    get.mockResolvedValue({ data: { items: [{ id: "venta-1" }] } });

    await expect(getVentas()).resolves.toEqual([{ id: "venta-1" }]);
    expect(get).toHaveBeenCalledWith("/ventas", {
      params: { limit: 1000, offset: 0, only_active: true },
    });
  });

  it("consulta el detalle de una venta", async () => {
    get.mockResolvedValue({ data: { id: "venta-1" } });

    await getVenta("venta-1");

    expect(get).toHaveBeenCalledWith("/ventas/venta-1");
  });

  it("registra una venta como borrador desde productos", async () => {
    const input: VentaDesdeProductosInput = {
      punto_emision_id: "punto-1",
      bodega_id: "bodega-1",
      tipo_identificacion_comprador: "CEDULA",
      identificacion_comprador: "0102030405",
      forma_pago: "EFECTIVO",
      usuario_auditoria: "frontend",
      detalles: [
        {
          producto_id: "producto-1",
          descripcion: "Producto",
          cantidad: 1,
          precio_unitario: 10,
        },
      ],
    };
    post.mockResolvedValue({ data: { id: "venta-1" } });

    await createVenta(input);

    expect(post).toHaveBeenCalledWith(
      "/ventas/desde-productos?emitir_automaticamente=false",
      input,
    );
  });

  it("emite y anula una venta con auditoría", async () => {
    post.mockResolvedValue({ data: { id: "venta-1" } });

    await emitVenta("venta-1");
    await cancelVenta("venta-1", "Error de digitación");

    expect(post).toHaveBeenNthCalledWith(1, "/ventas/venta-1/emitir", {
      usuario_auditoria: "frontend",
    });
    expect(post).toHaveBeenNthCalledWith(2, "/ventas/venta-1/anular", {
      usuario_auditoria: "frontend",
      confirmado_portal_sri: true,
      motivo: "Error de digitación",
    });
  });

  it("descarga XML y RIDE como blobs", async () => {
    get.mockResolvedValue({ data: new Blob() });

    await downloadVentaDocument("venta-1", "xml");
    await downloadVentaDocument("venta-1", "ride");

    expect(get).toHaveBeenNthCalledWith(1, "/documentos/venta-1/xml", {
      responseType: "blob",
    });
    expect(get).toHaveBeenNthCalledWith(2, "/documentos/venta-1/ride", {
      responseType: "blob",
    });
  });

  it("lista cuentas por cobrar y registra cobros por venta", async () => {
    get.mockResolvedValue({ data: { items: [{ id: "cxc-1" }] } });
    post.mockResolvedValue({ data: { id: "pago-1" } });

    await expect(getCuentasPorCobrar("cliente")).resolves.toEqual([
      { id: "cxc-1" },
    ]);
    expect(get).toHaveBeenCalledWith("/cxc", {
      params: {
        limit: 500,
        offset: 0,
        only_active: true,
        texto: "cliente",
      },
    });

    await createPagoCuentaPorCobrar("venta-1", {
      monto: 25,
      fecha: "2026-09-30",
      forma_pago_sri: "EFECTIVO",
      usuario_auditoria: "frontend",
    });
    expect(post).toHaveBeenCalledWith("/cxc/venta-1/pagos", {
      monto: 25,
      fecha: "2026-09-30",
      forma_pago_sri: "EFECTIVO",
      usuario_auditoria: "frontend",
    });
  });
});