import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import {
  createProductoIntegral,
  getAtributosEfectivos,
  getCategoriasSeleccionables,
  previewCambioCategoriaProducto,
  updateProductoIntegral,
  type ProductoIntegralCreateInput,
  type ProductoIntegralUpdateInput,
} from "./api";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

describe("cliente de producto integral", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValue({ data: { id: "product-1" } });
    vi.mocked(api.put).mockResolvedValue({ data: { id: "product-1" } });
  });

  it("consulta categorías seleccionables y atributos efectivos", async () => {
    await getCategoriasSeleccionables();
    await getAtributosEfectivos("category-1");

    expect(api.get).toHaveBeenNthCalledWith(1, "/categorias/seleccionables");
    expect(api.get).toHaveBeenNthCalledWith(
      2,
      "/categorias/category-1/atributos-efectivos",
    );
  });

  it("envía alta integral en un solo POST y sin campos legacy", async () => {
    const payload: ProductoIntegralCreateInput = {
      nombre: "Producto",
      tipo: "BIEN",
      pvp: 12.5,
      categoria_principal_id: "category-1",
      impuesto_catalogo_ids: ["tax-1"],
      atributos: [{ atributo_id: "attribute-1", valor: 3.5 }],
    };

    await createProductoIntegral(payload);

    expect(api.post).toHaveBeenCalledExactlyOnceWith("/productos", payload);
    expect(payload).not.toHaveProperty("categoria_ids");
    expect(payload).not.toHaveProperty("usuario_auditoria");
  });

  it("envía edición integral y preview con el borrador tipado", async () => {
    const update: ProductoIntegralUpdateInput = {
      categoria_principal_id: "category-1",
      precondicion_preview: "signed-token",
      atributos: [{ atributo_id: "attribute-1", valor: "3.5" }],
    };
    const preview = {
      categoria_principal_id: "category-2",
      atributos: [{ atributo_id: "attribute-1", valor: "4.5" }],
    };

    await updateProductoIntegral("product-1", update);
    await previewCambioCategoriaProducto("product-1", preview);

    expect(api.put).toHaveBeenCalledExactlyOnceWith(
      "/productos/product-1",
      update,
    );
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      "/productos/product-1/previsualizar-cambio-categoria",
      preview,
    );
  });
});