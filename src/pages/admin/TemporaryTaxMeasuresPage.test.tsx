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
      if (url === "/productos") return { data: { items: [{ id: "p-1", nombre: "Hospedaje turístico", tipo: "SERVICIO", activo: true }] } } as never;
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
});
