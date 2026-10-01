import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";
import TemporaryTaxMeasuresPage from "./TemporaryTaxMeasuresPage";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

const row = {
  id: "measure-1",
  empresa_id: "company-1",
  empresa_nombre: "Hotel Ecuador",
  nombre: "IVA turístico octubre",
  referencia_legal: "Decreto Ejecutivo 2026-001",
  tipo_impuesto: "IVA",
  componente: "PORCENTUAL",
  fecha_inicio: "2026-10-09",
  fecha_fin: "2026-10-11",
  codigo_impuesto_sri: "2",
  codigo_porcentaje_sri: "8",
  codigo_sri_confirmado: false,
  tarifa: "8.00",
  estado: "BORRADOR",
  productos: [{ producto_id: "p-1", producto_nombre: "Hospedaje turístico", factor_cantidad: null, unidad_gravable: null }],
};

const products = Array.from({ length: 13 }, (_, index) => ({
  id: `product-${index + 1}`,
  nombre: `Cerveza ${String(index + 1).padStart(2, "0")}`,
  tipo: "BIEN",
  activo: true,
  categorias: [{ id: "category-beer", nombre: "Bebidas" }],
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TemporaryTaxMeasuresPage />
    </QueryClientProvider>,
  );
}

describe("TemporaryTaxMeasuresPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/medidas-tributarias-temporales") {
        return { data: { items: [row], meta: { total: 1, limit: 200, offset: 0, next_offset: null, prev_offset: null, has_more: false, page: 1, page_count: 1 } } } as never;
      }
      if (url === "/empresas") return { data: { items: [{ id: "company-1", razon_social: "Hotel Ecuador", ruc: "1790012345001" }] } } as never;
      if (url === "/productos") return { data: { items: products, meta: { has_more: false, next_offset: null } } } as never;
      return { data: {} } as never;
    });
  });

  it("muestra empresa, producto y periodo legibles en la lista", async () => {
    renderPage();
    expect(await screen.findByText("Hotel Ecuador")).toBeInTheDocument();
    expect(screen.getByText("Hospedaje turístico")).toBeInTheDocument();
    expect(screen.getByText("2026-10-09 — 2026-10-11")).toBeInTheDocument();
  });

  it("permite buscar por nombre y bloquea activación sin confirmar código SRI", async () => {
    const user = userEvent.setup();
    renderPage();
    const activate = await screen.findByRole("button", { name: "Activar" });
    expect(activate).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Buscar medidas" }), "decreto");
    expect(screen.getByText("IVA turístico octubre")).toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Buscar medidas" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar medidas" }), "no existe");
    expect(screen.getByText("No hay medidas temporales")).toBeInTheDocument();
  });

  it("agrega todos los productos de una categoría y pagina seis sin perder la selección", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /Nueva medida/ }));
    await screen.findByRole("heading", { name: "Productos elegibles" });

    expect(screen.getByRole("button", { name: "Agregar categoría (0)" })).toBeDisabled();
    await user.selectOptions(screen.getByRole("combobox", { name: "Filtrar por categoría" }), "category-beer");
    expect(screen.getByRole("button", { name: "Agregar categoría (13)" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Agregar categoría (13)" }));

    expect(screen.getByText("13 seleccionados")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1 a 6 de 13 productos")).toBeInTheDocument();
    expect(screen.getByText("Cerveza 01")).toBeInTheDocument();
    expect(screen.queryByText("Cerveza 07")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Página 2" }));
    expect(screen.getByText("Cerveza 07")).toBeInTheDocument();
    expect(screen.getByText("13 seleccionados")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Limpiar selección" }));
    await user.click(screen.getByRole("button", { name: "Agregar todos los productos (13)" }));
    expect(screen.getByText("13 seleccionados")).toBeInTheDocument();
  });
});
