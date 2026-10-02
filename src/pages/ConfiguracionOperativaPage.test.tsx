import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";
import ConfiguracionOperativaPage from "./ConfiguracionOperativaPage";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ConfiguracionOperativaPage />
    </QueryClientProvider>,
  );
}

describe("ConfiguracionOperativaPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/empresas") return { data: { items: [{ id: "company-1", razon_social: "Comercial Andina" }] } } as never;
      if (url === "/sucursales") return { data: { items: [{ id: "branch-1", codigo: "001", nombre: "Matriz", direccion: "Centro", empresa_id: "company-1", es_matriz: true }] } } as never;
      if (url === "/puntos-emision") return { data: { items: [{ id: "point-1", codigo: "002", descripcion: "Caja principal", modalidad_emision: "ELECTRONICA", secuencial_actual: 1, sucursal_id: "branch-1" }] } } as never;
      return { data: {} } as never;
    });
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (url.endsWith("/FACTURA/siguiente")) return { data: { secuencial: "000000001", es_previsualizacion: true } } as never;
      return { data: { id: "point-2" } } as never;
    });
  });

  it("muestra modalidad y próximo folio completo en los puntos", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Puntos de emisión" }));

    expect(await screen.findByText("Electrónica")).toBeInTheDocument();
    expect(screen.getByText("001-002-000000001")).toBeInTheDocument();
  });

  it("crea una serie con modalidad y secuencial inicial explícitos", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Puntos de emisión" }));
    await user.click(screen.getByRole("button", { name: "Nuevo punto" }));

    await user.type(screen.getByRole("textbox", { name: "Código del punto" }), "003");
    await user.type(screen.getByRole("textbox", { name: "Descripción" }), "Caja física");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sucursal" }), "branch-1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Modalidad de la serie" }), "FISICA");
    await user.clear(screen.getByRole("spinbutton", { name: "Próximo secuencial inicial" }));
    await user.type(screen.getByRole("spinbutton", { name: "Próximo secuencial inicial" }), "7");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(api.post).toHaveBeenCalledWith("/puntos-emision", expect.objectContaining({
      codigo: "003",
      modalidad_emision: "FISICA",
      secuencial_actual: 7,
    }));
  });
});
