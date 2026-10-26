import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import api from "@/lib/api";
import CategoriasPage from "./CategoriasPage";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const parent = {
  id: "parent",
  nombre: "Categoría padre",
  es_padre: true,
  is_default: false,
  parent_id: null,
  activo: true,
};

const child = {
  id: "child",
  nombre: "Subcategoría",
  es_padre: false,
  is_default: false,
  parent_id: parent.id,
  activo: true,
};

const assignments = [
  {
    id: "assignment-parent",
    categoria_id: parent.id,
    atributo_id: "attribute-parent",
    obligatorio: false,
    valor_default: null,
  },
  {
    id: "assignment-child",
    categoria_id: child.id,
    atributo_id: "attribute-child",
    obligatorio: true,
    valor_default: null,
  },
];

describe("CategoriasPage", () => {
  let childActive: boolean;
  let childAttributeName: string;
  let childRequired: boolean;
  let childDefault: string | null;

  beforeEach(() => {
    vi.clearAllMocks();
    childActive = true;
    childAttributeName = "Atributo de la subcategoría";
    childRequired = false;
    childDefault = null;
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/categorias") {
        return {
          data: { items: childActive ? [parent, child] : [parent] },
        } as never;
      }
      if (url === "/categorias-atributos")
        return {
          data: assignments.map((assignment) =>
            assignment.id === "assignment-child"
              ? {
                  ...assignment,
                  obligatorio: childRequired,
                  valor_default: childDefault,
                }
              : assignment,
          ),
        } as never;
      if (url === "/atributos") {
        return {
          data: {
            items: [
              {
                id: "attribute-parent",
                nombre: "Atributo del padre",
                tipo_dato: "string",
              },
              {
                id: "attribute-child",
                nombre: childAttributeName,
                tipo_dato: "string",
              },
            ],
          },
        } as never;
      }
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
    });
    vi.mocked(api.delete).mockImplementation(async (url) => {
      if (url === "/categorias/child") childActive = false;
      return { data: undefined } as never;
    });
  });

  it("mueve el foco al padre activo y actualiza los atributos después de eliminar la seleccionada", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CategoriasPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("link", { name: "Administrar atributos" }),
    ).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    const attributesPanel = screen
      .getByText("Atributos propios y heredados")
      .closest("section");
    expect(attributesPanel).not.toBeNull();
    expect(
      within(attributesPanel!).getByRole("heading", { name: "Subcategoría" }),
    ).toBeInTheDocument();
    expect(
      within(attributesPanel!).getByText("Atributo de la subcategoría"),
    ).toBeInTheDocument();

    const deleteButtons = screen.getAllByTitle("Dar de baja categoría");
    await user.click(deleteButtons[1]);

    await waitFor(() => {
      expect(
        within(attributesPanel!).getByRole("heading", {
          name: "Categoría padre",
        }),
      ).toBeInTheDocument();
    });
    expect(
      within(attributesPanel!).getByText("Atributo del padre"),
    ).toBeInTheDocument();
    expect(
      within(attributesPanel!).queryByText("Atributo de la subcategoría"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Selecciona una categoría para revisar sus atributos.",
      ),
    ).not.toBeInTheDocument();
    expect(api.delete).toHaveBeenCalledWith("/categorias/child", {
      params: { confirmar_baja_productos: false },
    });
  });

  it("despliega acciones por atributo y confirma la baja global antes de eliminar", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CategoriasPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(
      screen.getByRole("button", {
        name: "Acciones de Atributo de la subcategoría",
      }),
    );

    expect(
      screen.getByRole("menuitem", { name: "Editar" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(screen.getByText(/La baja es global/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Dar de baja atributo" }),
    );

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/atributos/attribute-child"),
    );
  });

  it("edita inline y muestra el nombre actualizado en Categorías tras confirmar el preview", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        valores_activos: 2,
        asignaciones_activas: 1,
        productos_afectados: 2,
        convertibles: 2,
        incompatibles: [],
        remapeos_pendientes: 0,
      },
    } as never);
    vi.mocked(api.put).mockImplementation(async (_url, payload) => {
      childAttributeName = (payload as { nombre: string }).nombre;
      return {
        data: { id: "attribute-child", nombre: childAttributeName },
      } as never;
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CategoriasPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(
      screen.getByRole("button", {
        name: "Acciones de Atributo de la subcategoría",
      }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));

    const nameInput = await screen.findByRole("textbox", { name: "Nombre" });
    await user.clear(nameInput);
    await user.type(nameInput, "Garantía extendida");
    await user.click(
      screen.getByRole("button", { name: "Previsualizar cambios" }),
    );
    await screen.findByText(/2 valores: 2 convertibles y 0 incompatibles/);
    expect(api.put).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Aplicar cambios" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/atributos/attribute-child",
        expect.objectContaining({
          nombre: "Garantía extendida",
          tipo_dato: "string",
        }),
      ),
    );
    expect(await screen.findByText("Garantía extendida")).toBeInTheDocument();
  });

  it("permite volver obligatorio y confirmar el default solo para productos faltantes", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(api.put).mockImplementation(async (url, payload) => {
      if (url === "/categorias-atributos/assignment-child") {
        const updatePayload = payload as {
          obligatorio: boolean;
          valor_default: string;
          aplicar_default_a_existentes: boolean;
        };
        childRequired = updatePayload.obligatorio;
        childDefault = updatePayload.valor_default;
        return { data: { id: "assignment-child", ...updatePayload } } as never;
      }
      return { data: {} } as never;
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CategoriasPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(
      screen.getByRole("button", {
        name: "Acciones de Atributo de la subcategoría",
      }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Configurar categoría" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Configurar atributo Atributo de la subcategoría en categoría Subcategoría",
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("checkbox", { name: "Obligatorio en esta categoría" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Valor por defecto" }),
      "12 meses",
    );
    await user.click(
      screen.getByRole("checkbox", { name: /Aplicar el valor por defecto/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Guardar configuración" }),
    );

    expect(api.put).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        /únicamente a los productos existentes sin valor/,
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Aplicar a faltantes" }),
    );

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/categorias-atributos/assignment-child",
        {
          obligatorio: true,
          valor_default: "12 meses",
          aplicar_default_a_existentes: true,
          usuario_auditoria: "frontend",
        },
      ),
    );
    expect(await screen.findByText("12 meses")).toBeInTheDocument();
  });
  it("ordena categorías desde la primera carga y tras crear una nueva", async () => {
    const user = userEvent.setup();
    const categories = [
      { ...parent, id: "zeta", nombre: "Zeta" },
      { ...parent, id: "beta", nombre: "Beta" },
    ];
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/categorias")
        return { data: { items: [...categories] } } as never;
      if (url === "/atributos") return { data: { items: [] } } as never;
      return { data: [] } as never;
    });
    vi.mocked(api.post).mockImplementation(async () => {
      const created = { ...parent, id: "alfa", nombre: "Alfa" };
      categories.push(created);
      return { data: created } as never;
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CategoriasPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await screen.findByRole("button", { name: "Zeta" });
    const categoryNames = () =>
      screen
        .getAllByRole("button")
        .map((button) => button.textContent)
        .filter((name) => ["Alfa", "Beta", "Zeta"].includes(name ?? ""));
    expect(categoryNames()).toEqual(["Beta", "Zeta"]);
    await user.click(screen.getByRole("button", { name: "Nueva categoría" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Alfa");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await screen.findByRole("button", { name: "Alfa" });
    expect(categoryNames()).toEqual(["Alfa", "Beta", "Zeta"]);
  });

  it("ordena atributos propios y heredados juntos por nombre", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CategoriasPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    expect(
      screen
        .getAllByRole("button", { name: /^Acciones de/ })
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual([
      "Acciones de Atributo de la subcategoría",
      "Acciones de Atributo del padre",
    ]);
  });

  it("permite crear Laptop dentro de una categoría hoja", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      data: { ...child, id: "laptop", nombre: "Laptop", parent_id: child.id },
    } as never);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CategoriasPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Crear subcategoría en Subcategoría",
      }),
    );
    const parentSelector = screen.getByRole("combobox", {
      name: "Categoría padre",
    });
    expect(parentSelector).toHaveTextContent("Categoría padre › Subcategoría");
    await user.click(parentSelector);
    const categoryTree = screen.getByRole("listbox");
    expect(
      within(categoryTree).queryByText("Subcategoría"),
    ).not.toBeInTheDocument();
    await user.click(
      within(categoryTree).getByRole("button", { name: "Expandir" }),
    );
    await user.click(within(categoryTree).getByText("Subcategoría"));
    expect(parentSelector).toHaveTextContent("Categoría padre › Subcategoría");
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Laptop");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/categorias",
        expect.objectContaining({
          nombre: "Laptop",
          parent_id: child.id,
          es_padre: false,
        }),
      ),
    );
  });
});
