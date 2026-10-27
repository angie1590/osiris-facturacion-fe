import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import { getEffectivePermissions } from "@/features/personas/directory";
import UnidadesPage from "./UnidadesPage";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "actor-1" } }),
}));
vi.mock("@/features/personas/directory", () => ({
  getEffectivePermissions: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const permissions = [
  {
    codigo: "UNIDADES",
    nombre: "Unidades",
    puede_leer: true,
    puede_crear: false,
    puede_actualizar: false,
    puede_eliminar: false,
  },
];
const allUnitPermissions = [{
  ...permissions[0],
  puede_crear: true,
  puede_actualizar: true,
  puede_eliminar: true,
}];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UnidadesPage />
    </QueryClientProvider>,
  );
}

describe("UnidadesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra unidades con símbolos exactos y destaca el seed protegido", async () => {
    vi.mocked(getEffectivePermissions).mockResolvedValue(permissions);
    vi.mocked(api.get).mockResolvedValue({
      data: {
        items: [
          {
            id: "mb",
            codigo: "MEGABYTE",
            nombre: "Megabyte",
            simbolo: "MB",
            magnitud_codigo: "DATA_STORAGE",
            es_sistema: true,
            activo: true,
            uso: { atributos_activos: 0, atributos_inactivos: 0, snapshots_historicos: 0 },
          },
          {
            id: "mbit",
            codigo: "MEGABIT",
            nombre: "Megabit",
            simbolo: "Mb",
            magnitud_codigo: "DATA_STORAGE",
            es_sistema: false,
            activo: false,
            uso: { atributos_activos: 1, atributos_inactivos: 2, snapshots_historicos: 3 },
          },
        ],
        meta: { total: 2, limit: 50, offset: 0, page: 1, page_count: 1 },
      },
    } as never);

    renderPage();

    expect(await screen.findByText("Sistema protegido")).toBeInTheDocument();
    expect(screen.getByText("MB")).toBeInTheDocument();
    expect(screen.getByText("Mb")).toBeInTheDocument();
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      "/unidades",
      expect.objectContaining({
        params: expect.objectContaining({ only_active: true, limit: 50 }),
      }),
    );
  });

  it("no solicita unidades cuando falta el permiso efectivo de lectura", async () => {
    vi.mocked(getEffectivePermissions).mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText(
        "No tienes permiso para consultar el catálogo de unidades.",
      ),
    ).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("crea unidades con permisos efectivos y envía el símbolo exacto", async () => {
    const user = userEvent.setup();
    vi.mocked(getEffectivePermissions).mockResolvedValue(allUnitPermissions);
    vi.mocked(api.get).mockResolvedValue({
      data: {
        items: [],
        meta: { total: 0, limit: 50, offset: 0, page: 1, page_count: 1 },
      },
    } as never);
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: "new-unit",
        codigo: "MEGABIT",
        nombre: "Megabit",
        simbolo: "Mb",
        magnitud_codigo: "DATA_STORAGE",
        es_sistema: false,
        activo: true,
        creado_en: "2026-10-27T00:00:00Z",
        actualizado_en: "2026-10-27T00:00:00Z",
        uso: { atributos_activos: 0, atributos_inactivos: 0, snapshots_historicos: 0 },
      },
    } as never);

    renderPage();
    await user.click(await screen.findByRole("button", { name: "Nueva unidad" }));
    await user.type(screen.getByLabelText(/Código/), "MEGABIT");
    await user.type(screen.getByLabelText(/Nombre/), "Megabit");
    await user.type(screen.getByLabelText(/Símbolo/), "Mb");
    await user.type(screen.getByLabelText("Magnitud de la unidad"), "DATA_STORAGE");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("heading", { name: "Unidades de atributo" })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/unidades", {
      codigo: "MEGABIT",
      nombre: "Megabit",
      simbolo: "Mb",
      magnitud_codigo: "DATA_STORAGE",
    });
  });

  it("preserva el formulario y explica un código duplicado del backend", async () => {
    const user = userEvent.setup();
    vi.mocked(getEffectivePermissions).mockResolvedValue(allUnitPermissions);
    vi.mocked(api.get).mockResolvedValue({
      data: {
        items: [],
        meta: { total: 0, limit: 50, offset: 0, page: 1, page_count: 1 },
      },
    } as never);
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { detail: { code: "UNIT_DUPLICATE_CODE", message: "Conflicto" } } },
    });

    renderPage();
    await user.click(await screen.findByRole("button", { name: "Nueva unidad" }));
    await user.type(screen.getByLabelText(/Código/), "MEGABIT");
    await user.type(screen.getByLabelText(/Nombre/), "Megabit");
    await user.type(screen.getByLabelText(/Símbolo/), "Mb");
    await user.type(screen.getByLabelText("Magnitud de la unidad"), "DATA_STORAGE");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una unidad con ese código.",
    );
    expect(screen.getByLabelText(/Código/)).toHaveValue("MEGABIT");
  });

  it("edita, desactiva con confirmación y reactiva desde historial", async () => {
    const user = userEvent.setup();
    let unit = {
      id: "custom-unit",
      codigo: "MEGABIT",
      nombre: "Megabit",
      simbolo: "Mb",
      magnitud_codigo: "DATA_STORAGE",
      es_sistema: false,
      activo: true,
      creado_en: "2026-10-27T00:00:00Z",
      actualizado_en: "2026-10-27T00:00:00Z",
      uso: { atributos_activos: 0, atributos_inactivos: 0, snapshots_historicos: 0 },
    };
    vi.mocked(getEffectivePermissions).mockResolvedValue(allUnitPermissions);
    vi.mocked(api.get).mockImplementation(async (_url, config) => ({
      data: {
        items: config?.params?.only_active && !unit.activo ? [] : [unit],
        meta: { total: 1, limit: 50, offset: 0, page: 1, page_count: 1 },
      },
    } as never));
    vi.mocked(api.put).mockImplementation(async (_url, payload) => {
      unit = { ...unit, ...(payload as typeof unit) };
      return { data: unit } as never;
    });
    vi.mocked(api.delete).mockImplementation(async () => {
      unit = { ...unit, activo: false };
      return { data: unit } as never;
    });
    vi.mocked(api.post).mockImplementation(async () => {
      unit = { ...unit, activo: true };
      return { data: unit } as never;
    });

    renderPage();
    await user.click(await screen.findByRole("button", { name: "Editar Megabit" }));
    const nameInput = screen.getByLabelText(/Nombre/);
    await user.clear(nameInput);
    await user.type(nameInput, "Megabit actualizado");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(api.put).toHaveBeenCalledWith("/unidades/custom-unit", {
      codigo: "MEGABIT",
      nombre: "Megabit actualizado",
      simbolo: "Mb",
      magnitud_codigo: "DATA_STORAGE",
    });

    await user.click(await screen.findByRole("button", { name: "Desactivar Megabit actualizado" }));
    expect(await screen.findByRole("heading", { name: "Desactivar unidad" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Desactivar$/ }));
    expect(api.delete).toHaveBeenCalledWith("/unidades/custom-unit");
    expect(await screen.findByText("No hay unidades")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Incluir historial" }));
    await user.click(await screen.findByRole("button", { name: "Reactivar Megabit actualizado" }));
    expect(api.post).toHaveBeenCalledWith("/unidades/custom-unit/reactivar");
  });
});