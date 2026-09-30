import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCompra,
  createRetencion,
  getCompras,
  getRetencionSugerida,
  type CompraDesdeProductosInput,
  type RetencionCreateInput,
} from "./api";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: { get, post },
}));

describe("compras api", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("lista compras con el filtro de actividad solicitado", async () => {
    get.mockResolvedValue({ data: { items: [{ id: "compra-1" }] } });

    await expect(getCompras(true)).resolves.toEqual([{ id: "compra-1" }]);
    expect(get).toHaveBeenCalledWith("/compras", {
      params: { limit: 1000, offset: 0, only_active: true },
    });
  });

  it("registra una compra mediante el endpoint desde productos", async () => {
    const input: CompraDesdeProductosInput = {
      proveedor_id: "proveedor-1",
      secuencial_factura: "001-001-000000001",
      autorizacion_sri: "1".repeat(49),
      fecha_emision: "2026-09-30",
      sustento_tributario: "01",
      tipo_identificacion_proveedor: "RUC",
      identificacion_proveedor: "1790012345001",
      forma_pago: "EFECTIVO",
      usuario_auditoria: "frontend",
      detalles: [
        {
          producto_id: "producto-1",
          descripcion: "Producto",
          cantidad: 2,
          precio_unitario: 5,
        },
      ],
    };
    post.mockResolvedValue({ data: { id: "compra-1" } });

    await expect(createCompra(input)).resolves.toEqual({ id: "compra-1" });
    expect(post).toHaveBeenCalledWith("/compras/desde-productos", input);
  });

  it("consulta la sugerencia de retención de una compra", async () => {
    get.mockResolvedValue({ data: { compra_id: "compra-1", detalles: [] } });

    await getRetencionSugerida("compra-1");

    expect(get).toHaveBeenCalledWith(
      "/compras/compra-1/sugerir-retencion",
    );
  });

  it("registra la retención con su compra", async () => {
    const input: RetencionCreateInput = {
      fecha_emision: "2026-09-30",
      usuario_auditoria: "frontend",
      detalles: [
        {
          codigo_retencion_sri: "303",
          tipo: "RENTA",
          porcentaje: 10,
          base_calculo: 100,
        },
      ],
    };
    post.mockResolvedValue({ data: { id: "retencion-1" } });

    await createRetencion("compra-1", input);

    expect(post).toHaveBeenCalledWith(
      "/compras/compra-1/retenciones",
      input,
    );
  });
});