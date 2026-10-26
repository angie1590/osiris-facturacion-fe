import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";
import { getPersonas, setPersonaActive } from "@/features/personas/api";
import PersonasPage from "./PersonasPage";
import { directoryResponse, emptyLinks } from "@/test/directory-fixtures";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "current-user" } }),
}));

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
    vi.clearAllMocks();
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
      return { data: directoryResponse(String(url)) } as never;
    });
    vi.mocked(api.put).mockResolvedValue({ data: persona } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: undefined } as never);
    vi.mocked(api.post).mockResolvedValue({ data: persona } as never);
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
      }),
    );
    expect(vi.mocked(api.put).mock.calls[0][1]).not.toHaveProperty(
      "usuario_auditoria",
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
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Desactivar" })).toBeEnabled(),
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
    expect(api.post).toHaveBeenCalledWith("/personas/persona-1/reactivar");
  });

  it.each([
    { activo: true, actualizar: false, eliminar: false, visible: false },
    { activo: true, actualizar: true, eliminar: false, visible: false },
    { activo: false, actualizar: false, eliminar: true, visible: false },
    { activo: false, actualizar: true, eliminar: false, visible: true },
    { activo: true, actualizar: false, eliminar: true, visible: true },
  ])(
    "respeta permisos de estado por fila: %j",
    async ({ activo, actualizar, eliminar, visible }) => {
      const original = vi.mocked(api.get).getMockImplementation()!;
      vi.mocked(api.get).mockImplementation(async (...args) => {
        if (String(args[0]).endsWith("/permisos"))
          return {
            data: [
              {
                codigo: "PERSONAS",
                puede_leer: true,
                puede_crear: false,
                puede_actualizar: actualizar,
                puede_eliminar: eliminar,
              },
            ],
          } as never;
        if (args[0] === "/personas")
          return {
            data: {
              items: [{ ...persona, activo }],
              meta: { total: 1, limit: 20, offset: 0 },
            },
          } as never;
        return original(...args);
      });
      renderPage();
      await screen.findByRole("button", { name: "Ver persona Ana Pineda" });
      const control = screen.queryByRole("button", {
        name: `${activo ? "Desactivar" : "Activar"} persona Ana Pineda`,
      });
      if (visible) expect(control).toBeInTheDocument();
      else expect(control).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Nuevo Persona" }),
      ).not.toBeInTheDocument();
    },
  );

  it("busca en servidor y distingue inactivos de todos", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      await screen.findByLabelText("Buscar directorio"),
      "fuera de pagina",
    );
    await user.selectOptions(
      screen.getByLabelText("Estado del directorio"),
      "inactivo",
    );
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        "/personas",
        expect.objectContaining({
          params: expect.objectContaining({
            q: "fuera de pagina",
            estado: "inactivo",
            only_active: false,
            offset: 0,
            limit: 20,
          }),
        }),
      ),
    );
    await user.selectOptions(
      screen.getByLabelText("Estado del directorio"),
      "todos",
    );
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        "/personas",
        expect.objectContaining({
          params: expect.objectContaining({
            estado: undefined,
            only_active: false,
          }),
        }),
      ),
    );
  });

  it("ordena en servidor y reinicia la pagina", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Nombre" }));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        "/personas",
        expect.objectContaining({
          params: expect.objectContaining({
            sort_by: "nombre",
            sort_direction: "desc",
            offset: 0,
          }),
        }),
      ),
    );
  });

  it("bloquea la baja cuando hay dependencias activas", async () => {
    const original = vi.mocked(api.get).getMockImplementation()!;
    vi.mocked(api.get).mockImplementation(async (...args) =>
      args[0] === "/personas/persona-1/vinculos"
        ? ({
            data: {
              ...emptyLinks,
              dependencias_activas: [
                {
                  recurso: "CLIENTES",
                  id: "cliente-1",
                  nombre: "Cliente Ana Pineda",
                },
              ],
            },
          } as never)
        : original(...args),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", {
        name: "Desactivar persona Ana Pineda",
      }),
    );
    expect(
      await screen.findByText(/Dependencias activas: Cliente Ana Pineda/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeDisabled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("refresca dependencias si aparecen despues y el backend rechaza con 409", async () => {
    vi.mocked(api.delete).mockRejectedValue({
      response: {
        status: 409,
        data: { detail: "Persona tiene una nueva dependencia" },
      },
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", {
        name: "Desactivar persona Ana Pineda",
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Desactivar" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Desactivar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "nueva dependencia",
    );
    expect(api.get).toHaveBeenCalledWith(
      "/personas/persona-1/vinculos",
      expect.anything(),
    );
  });
});
