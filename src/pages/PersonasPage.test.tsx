import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";
import { getPersonas, setPersonaActive } from "@/features/personas/api";
import PersonasPage from "./PersonasPage";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const persona = {
  id: "persona-1",
  identificacion: "0103523908001",
  tipo_identificacion: "CEDULA",
  nombre: "Ana",
  apellido: "Pineda",
  direccion: "Calle Principal",
  telefono: "0999123456",
  ciudad: "Cuenca",
  email: "ana@example.com",
  activo: true,
  creado_en: "2026-01-01T00:00:00",
  actualizado_en: "2026-01-01T00:00:00",
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PersonasPage />
    </QueryClientProvider>,
  );
}

describe("PersonasPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/personas")
        return {
          data: { items: [persona], meta: { total: 1, limit: 50, offset: 0 } },
        } as never;
      if (
        url === "/clientes" ||
        url === "/proveedores-persona" ||
        url === "/proveedores-sociedad"
      )
        return { data: { items: [] } } as never;
      if (url === "/tipos-cliente") return { data: { items: [] } } as never;
      if (url === "/tipos-contribuyente") return { data: [] } as never;
      return { data: {} } as never;
    });
    vi.mocked(api.put).mockResolvedValue({ data: persona } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: undefined } as never);
  });

  it("edita una persona y envía opcionales vacíos como null", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Editar persona Ana Pineda" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Editar Persona" }),
    ).toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Nombre" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Daniel");
    await user.clear(screen.getByRole("textbox", { name: "Teléfono" }));
    await user.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(api.put).toHaveBeenCalledWith(
      "/personas/persona-1",
      expect.objectContaining({
        identificacion: "0103523908001",
        tipo_identificacion: "CEDULA",
        nombre: "Daniel",
        apellido: "Pineda",
        direccion: "Calle Principal",
        telefono: null,
        ciudad: "Cuenca",
        email: "ana@example.com",
        usuario_auditoria: "frontend",
      }),
    );
  });

  it("confirma la baja lógica de una persona", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", {
        name: "Desactivar persona Ana Pineda",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    expect(api.delete).toHaveBeenCalledWith("/personas/persona-1");
  });

  it("reactiva personas y consulta la lista incluyendo inactivas", async () => {
    await getPersonas(0, 1000, false);
    await setPersonaActive("persona-1", true);
    expect(api.get).toHaveBeenCalledWith("/personas", {
      params: { offset: 0, limit: 1000, only_active: false },
    });
    expect(api.put).toHaveBeenCalledWith("/personas/persona-1", {
      activo: true,
      usuario_auditoria: "frontend",
    });
  });
});
