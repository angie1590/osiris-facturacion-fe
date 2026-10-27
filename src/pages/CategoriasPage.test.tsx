import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import api from "@/lib/api";
import type { CategoriaAtributoEfectivo } from "@/features/categorias/api";
import { Toaster } from "@/components/ui/toaster";
import CategoriasPage from "./CategoriasPage";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "actor" } }),
}));

const categoryPermissions = ["CATEGORIAS", "ATRIBUTOS"].map((codigo) => ({
  codigo,
  nombre: codigo,
  puede_leer: true,
  puede_crear: true,
  puede_actualizar: true,
  puede_eliminar: true,
}));
const unitReadPermission = {
  codigo: "UNIDADES",
  nombre: "UNIDADES",
  puede_leer: true,
  puede_crear: false,
  puede_actualizar: false,
  puede_eliminar: false,
};
let includeUnitReadPermission = false;

const child = {
  id: "child",
  nombre: "Subcategoría",
  es_padre: false,
  tiene_hijos: false,
  is_default: false,
  parent_id: "parent",
  activo: true,
  atributos_propios_count: 1,
  atributos_efectivos_count: 1,
  hijos: [],
};

const parent = {
  id: "parent",
  nombre: "Categoría padre",
  es_padre: true,
  tiene_hijos: true,
  is_default: false,
  parent_id: null,
  activo: true,
  atributos_propios_count: 1,
  atributos_efectivos_count: 1,
  hijos: [child],
};

const assignments = [
  {
    id: "assignment-parent",
    categoria_id: parent.id,
    atributo_id: "attribute-parent",
    orden: null,
    obligatorio: false,
    valor_default: null,
  },
  {
    id: "assignment-child",
    categoria_id: child.id,
    atributo_id: "attribute-child",
    orden: null,
    obligatorio: true,
    valor_default: null,
  },
];

function effectiveAttributesFor(
  categoryId: string,
  source = assignments,
  childName = "Atributo de la subcategoría",
  childRequired = false,
  childDefault: string | null = null,
  ownOnly = false,
): CategoriaAtributoEfectivo[] {
  return source
    .filter((assignment) =>
      ownOnly
        ? assignment.categoria_id === categoryId
        : assignment.categoria_id === categoryId ||
          (categoryId === child.id && assignment.categoria_id === parent.id),
    )
    .map((assignment) => {
      const inherited = assignment.categoria_id !== categoryId;
      const isChildAssignment = assignment.id === "assignment-child";
      return {
        mapping_id: assignment.id,
        atributo_id: assignment.atributo_id,
        codigo: assignment.atributo_id.replace("attribute-", ""),
        nombre: isChildAssignment ? childName : "Atributo del padre",
        tipo_dato: "string",
        unidad: null,
        restricciones: {
          allow_negative: false,
          min_value: null,
          max_value: null,
        },
        select_options: null,
        catalog_id: null,
        obligatorio: isChildAssignment ? childRequired : assignment.obligatorio ?? false,
        valor_default: isChildAssignment ? childDefault : assignment.valor_default,
        orden: null,
        categoria_origen: {
          id: assignment.categoria_id,
          nombre: inherited ? parent.nombre : child.nombre,
        },
        profundidad: inherited ? 1 : 0,
        heredado: inherited,
      };
    })
    .sort((first, second) =>
      first.nombre.localeCompare(second.nombre, "es", {
        sensitivity: "base",
      }),
    );
}

function effectiveRouteResponse(
  url: string,
  source = assignments,
  childName = "Atributo de la subcategoría",
  childRequired = false,
  childDefault: string | null = null,
) {
  const match = url.match(/^\/categorias\/([^/]+)\/atributos-(efectivos|propios)$/);
  if (!match) return null;
  return {
    data: effectiveAttributesFor(
      match[1],
      source,
      childName,
      childRequired,
      childDefault,
      match[2] === "propios",
    ),
  };
}

function categoryAttributePreview(faltantes: { id: string; nombre: string; motivo: string }[] = []) {
  return {
    data: {
      operacion: "UPDATE_CATEGORY_ATTRIBUTE",
      resumen: faltantes.length
        ? `${faltantes.length} de 2 productos activos carecen de un valor válido.`
        : "No hay faltantes entre 2 productos activos afectados.",
      conteos: {
        productos_afectados: 2,
        productos_faltantes: faltantes.length,
      },
      faltantes,
      requiere_confirmacion: true,
      acciones_permitidas: ["confirmar", "cancelar"],
      precondicion_preview: "signed-preview",
    },
  } as never;
}

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
    includeUnitReadPermission = false;
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return {
          data: includeUnitReadPermission
            ? [...categoryPermissions, unitReadPermission]
            : categoryPermissions,
        } as never;
      if (url === "/categorias/arbol") {
        return {
          data: [childActive ? parent : { ...parent, tiene_hijos: false, es_padre: false, hijos: [] }],
        } as never;
      }
      const effectiveResponse = effectiveRouteResponse(
        String(url),
        assignments,
        childAttributeName,
        childRequired,
        childDefault,
      );
      if (effectiveResponse) return effectiveResponse as never;
      if (url === "/atributos") {
        return {
          data: {
            items: [
              {
                id: "attribute-parent",
                nombre: "Atributo del padre",
                tipo_dato: "decimal",
                unidad_id: "unit-cm",
                unidad: {
                  id: "unit-cm",
                  codigo: "centimetro",
                  nombre: "Centímetro",
                  simbolo: "cm",
                  magnitud_codigo: "longitud",
                },
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
      if (url === "/unidades")
        return {
          data: {
            items: [
              {
                id: "unit-cm",
                codigo: "CENTIMETRO",
                nombre: "Centímetro",
                simbolo: "cm",
                magnitud_codigo: "LENGTH",
                es_sistema: true,
                activo: true,
                uso: {
                  atributos_activos: 1,
                  atributos_inactivos: 0,
                  snapshots_historicos: 0,
                },
              },
              {
                id: "unit-gb",
                codigo: "GIGABYTE",
                nombre: "Gigabyte",
                simbolo: "GB",
                magnitud_codigo: "DATA_STORAGE",
                es_sistema: true,
                activo: true,
                uso: {
                  atributos_activos: 0,
                  atributos_inactivos: 0,
                  snapshots_historicos: 0,
                },
              },
            ],
            meta: { total: 1, limit: 1000, offset: 0, page: 1, page_count: 1 },
          },
        } as never;
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
    vi.mocked(api.post).mockResolvedValue({
      data: {
        operacion: "DEACTIVATE_ATTRIBUTE",
        resumen: "La baja desactivará 1 asignación y 2 valores EAV activos.",
        conteos: { asignaciones_activas: 1, valores_activos: 2, remapeos_pendientes: 0 },
        faltantes: [],
        remapeos: [],
        precondicion_preview: "deactivate-preview",
      },
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
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(
      screen.getByRole("button", {
        name: "Acciones de Atributo de la subcategoría",
      }),
    );

    expect(
      screen.getByRole("menuitem", { name: "Editar definición global" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("menuitem", { name: "Dar de baja atributo global" }),
    );
    expect(screen.getByText(/La baja es global/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Previsualizar baja" }),
    );
    expect(await screen.findByText(/2 valores EAV activos/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Dar de baja global" }),
    );

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith(
        "/atributos/attribute-child",
        {
          data: {
            payload: { confirmar: true },
            precondicion_preview: "deactivate-preview",
          },
        },
      ),
    );
  });

  it("muestra ciclo de un atributo inactivo y ofrece reactivar solo con snapshot disponible", async () => {
    const user = userEvent.setup();
    let historyAttributeActive = false;
    vi.mocked(api.get).mockImplementation(async (url, config) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol") return { data: [parent] } as never;
      const effectiveResponse = effectiveRouteResponse(String(url));
      if (effectiveResponse) return effectiveResponse as never;
      if (url === "/atributos") {
        const items = [
          { id: "attribute-parent", nombre: "Atributo del padre", tipo_dato: "string", activo: true },
          {
            id: "attribute-history",
            nombre: "Atributo histórico",
            codigo: "atributo_historico",
            tipo_dato: "string",
            activo: historyAttributeActive,
          },
        ];
        return {
          data: {
            items: config?.params?.only_active === false
              ? items
              : items.filter((item) => item.activo),
          },
        } as never;
      }
      if (url === "/atributos/attribute-history/reversion")
        return {
          data: {
            can_undo: false,
            can_reactivate: true,
            operacion: "deactivate",
            creado_en: "2026-10-25T12:00:00Z",
            valores_afectados: 3,
            categorias_afectadas: 2,
            motivo: null,
          },
        } as never;
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
    });
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (url === "/atributos/attribute-history/reactivar") {
        historyAttributeActive = true;
        return { data: { activo: true } } as never;
      }
      return { data: {} } as never;
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

    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(screen.getByRole("button", { name: "Historial de atributos" }));
    await user.click(
      await screen.findByRole("button", { name: "Revisar ciclo" }),
    );
    expect(await screen.findByText(/Última operación: deactivate/)).toBeInTheDocument();
    expect(screen.getByText(/3 valores y 2 asignaciones/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reactivar atributo" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/atributos/attribute-history/reactivar"),
    );
    await waitFor(() =>
      expect(screen.queryByText("Atributo histórico")).not.toBeInTheDocument(),
    );
  });

  it("conserva el diálogo de ciclo cuando undo devuelve ATTRIBUTE_STATE_CHANGED", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol") return { data: [parent] } as never;
      const effectiveResponse = effectiveRouteResponse(String(url));
      if (effectiveResponse) return effectiveResponse as never;
      if (url === "/atributos") return { data: { items: [] } } as never;
      if (url === "/atributos/attribute-child/reversion")
        return {
          data: {
            can_undo: true,
            can_reactivate: false,
            operacion: "update",
            creado_en: "2026-10-25T12:00:00Z",
            valores_afectados: 1,
            categorias_afectadas: 1,
            motivo: null,
          },
        } as never;
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
    });
    vi.mocked(api.post).mockRejectedValue({
      response: {
        status: 409,
        data: {
          detail: {
            code: "ATTRIBUTE_STATE_CHANGED",
            message: "El estado del atributo cambió después del snapshot.",
          },
        },
      },
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
      screen.getByRole("menuitem", { name: "Revisar último cambio global" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Revertir último cambio" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El estado del atributo cambió después del snapshot.",
    );
    expect(screen.getByRole("dialog", { name: /Ciclo de vida de/ })).toBeInTheDocument();
    expect(
      screen.queryByText("Último cambio revertido"),
    ).not.toBeInTheDocument();
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
    await user.click(
      screen.getByRole("menuitem", { name: "Editar definición global" }),
    );

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
    vi.mocked(api.post).mockResolvedValue(
      categoryAttributePreview([
        { id: "product-missing", nombre: "Producto faltante", motivo: "Sin valor activo" },
      ]),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(api.put).mockImplementation(async (url, payload) => {
      if (url === "/categorias/child/atributos/assignment-child") {
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
      screen.getByRole("textbox", { name: "Valor por defecto (opcional)" }),
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
      await screen.findByText(/1 de 2 productos activos carecen de un valor válido/),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Producto faltante/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Aplicar a faltantes" }),
    );

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/categorias/child/atributos/assignment-child",
        {
          orden: null,
          obligatorio: true,
          valor_default: "12 meses",
          aplicar_default_a_existentes: true,
          precondicion_preview: "signed-preview",
        },
      ),
    );
    expect(await screen.findByText("12 meses")).toBeInTheDocument();
  });
  it("ordena categorías desde la primera carga y tras crear una nueva", async () => {
    const user = userEvent.setup();
    const categories = [
      { ...parent, id: "beta", nombre: "Beta", tiene_hijos: false, hijos: [] },
      { ...parent, id: "zeta", nombre: "Zeta", tiene_hijos: false, hijos: [] },
    ];
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol") return { data: [...categories] } as never;
      if (url === "/atributos") return { data: { items: [] } } as never;
      return { data: [] } as never;
    });
    vi.mocked(api.post).mockImplementation(async () => {
      const created = {
        ...parent,
        id: "alfa",
        nombre: "Alfa",
        tiene_hijos: false,
        es_padre: false,
        hijos: [],
      };
      categories.push(created);
      categories.sort((first, second) => first.nombre.localeCompare(second.nombre));
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

  it("preserva el orden del backend y muestra unidad y origen efectivos", async () => {
    const user = userEvent.setup();
    const backendAttributes: CategoriaAtributoEfectivo[] = [
      {
        mapping_id: "mapping-zulu",
        atributo_id: "attribute-zulu",
        codigo: "zulu",
        nombre: "Zulu primero",
        tipo_dato: "integer",
        unidad: {
          id: "unit-gb",
          codigo: "GB",
          nombre: "Gigabyte",
          simbolo: "GB",
          magnitud_codigo: "DATA_STORAGE",
        },
        restricciones: {
          allow_negative: false,
          min_value: null,
          max_value: null,
        },
        select_options: null,
        catalog_id: null,
        obligatorio: false,
        valor_default: "16",
        orden: 1,
        categoria_origen: { id: child.id, nombre: child.nombre },
        profundidad: 0,
        heredado: false,
      },
      {
        mapping_id: "mapping-alpha",
        atributo_id: "attribute-alpha",
        codigo: "alpha",
        nombre: "Alpha al final",
        tipo_dato: "string",
        unidad: null,
        restricciones: {
          allow_negative: false,
          min_value: null,
          max_value: null,
        },
        select_options: null,
        catalog_id: null,
        obligatorio: false,
        valor_default: null,
        orden: null,
        categoria_origen: { id: parent.id, nombre: parent.nombre },
        profundidad: 1,
        heredado: true,
      },
    ];
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol") return { data: [parent] } as never;
      if (url === `/categorias/${child.id}/atributos-efectivos`)
        return { data: backendAttributes } as never;
      if (url === `/categorias/${child.id}/atributos-propios`)
        return { data: [backendAttributes[0]] } as never;
      if (url === "/atributos") return { data: { items: [] } } as never;
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
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

    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));

    expect(await screen.findByText("integer · GB")).toBeInTheDocument();
    expect(screen.getByTitle("Heredado de Categoría padre")).toHaveTextContent(
      "Heredado",
    );
    expect(
      screen
        .getAllByRole("button", { name: /^Acciones de/ })
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Acciones de Zulu primero", "Acciones de Alpha al final"]);
  });

  it("mantiene visibles los nombres largos de atributos en móvil", async () => {
    const user = userEvent.setup();
    childAttributeName =
      "Conectividad inalámbrica y compatibilidad de dispositivos externos";
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

    const attributeName = await screen.findByText(childAttributeName);
    expect(attributeName).not.toHaveClass("truncate");
    expect(attributeName).toHaveClass("break-words");
    expect(attributeName.parentElement).toHaveClass("col-span-2");
  });

  it("muestra error de efectivos y permite reintentar sin exponer datos anteriores", async () => {
    const user = userEvent.setup();
    let effectiveReads = 0;
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol") return { data: [parent] } as never;
      if (url === "/atributos") return { data: { items: [] } } as never;
      const match = String(url).match(
        /^\/categorias\/([^/]+)\/atributos-(efectivos|propios)$/,
      );
      if (match?.[2] === "efectivos" && effectiveReads++ === 0) {
        throw { response: { status: 503, data: { detail: "offline" } } };
      }
      if (match) return { data: [] } as never;
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
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

    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar los atributos efectivos de esta categoría.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByText(
        "Esta categoría y sus categorías superiores no tienen atributos asignados.",
      ),
    ).toBeInTheDocument();
    expect(effectiveReads).toBe(2);
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
        }),
      ),
    );
  });

  it("previsualiza el impacto B3 y confirma con el payload y token exactos", async () => {
    const user = userEvent.setup();
    const payload = { nombre: "Child B3", parent_id: parent.id };
    const preview = {
      operacion: "CREATE_CATEGORY_B3",
      resumen: "Se reclasificarán 2 productos directos.",
      conteos: { productos_directos: 2 },
      requiere_confirmacion: true,
      acciones_permitidas: ["confirmar", "cancelar"],
      precondicion_preview: "opaque-b3-token",
    };
    let confirmCalls = 0;
    vi.mocked(api.post).mockImplementation(async (url, body) => {
      if (url === "/categorias") {
        if ("payload" in (body as object)) {
          confirmCalls += 1;
          return { data: { ...child, id: "created-b3" } } as never;
        }
        throw {
          response: {
            status: 409,
            data: {
              detail: {
                code: "CATEGORY_CHANGE_REQUIRES_CONFIRMATION",
                message: "B3 requiere confirmación.",
                conteos: { productos_directos: 2 },
                acciones_permitidas: ["previsualizar"],
              },
            },
          },
        };
      }
      if (url === "/categorias/previsualizar") return { data: preview } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
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
    await user.click(await screen.findByRole("button", { name: "Nueva categoría" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), payload.nombre);
    await user.click(screen.getByRole("combobox", { name: "Categoría padre" }));
    const tree = screen.getByRole("listbox");
    await user.click(within(tree).getByText("Categoría padre"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("heading", { name: "Reclasificar productos directos" })).toBeInTheDocument();
    expect(screen.getByText(/2 productos pasarán/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/categorias/previsualizar", payload);
    await user.click(screen.getByRole("button", { name: "Confirmar reclasificación" }));
    await waitFor(() => expect(confirmCalls).toBe(1));
    expect(api.post).toHaveBeenLastCalledWith("/categorias", {
      payload,
      confirmar_b3: true,
      precondicion_preview: "opaque-b3-token",
    });
  });

  it("un preview B3 stale se renueva sin reintentar automáticamente la mutación", async () => {
    const user = userEvent.setup();
    const payload = { nombre: "Child B3", parent_id: parent.id };
    const previews = ["token-one", "token-two"];
    const productCounts = [2, 0];
    vi.mocked(api.post).mockImplementation(async (url, body) => {
      if (url === "/categorias/previsualizar") {
        const productosDirectos = productCounts.shift() ?? 0;
        return {
          data: {
            operacion: "CREATE_CATEGORY_B3",
            resumen: productosDirectos
              ? `Se reclasificarán ${productosDirectos} productos.`
              : "No hay productos directos que reclasificar.",
            conteos: { productos_directos: productosDirectos },
            requiere_confirmacion: productosDirectos > 0,
            acciones_permitidas: productosDirectos > 0
              ? ["confirmar", "cancelar"]
              : ["continuar"],
            precondicion_preview: previews.shift(),
          },
        } as never;
      }
      if (url === "/categorias" && "payload" in (body as object))
        throw {
          response: {
            status: 409,
            data: {
              detail: {
                code: "CATALOG_PREVIEW_STALE",
                message: "El estado cambió.",
                conteos: {},
                acciones_permitidas: ["previsualizar"],
              },
            },
          },
        };
      if (url === "/categorias")
        throw {
          response: {
            status: 409,
            data: {
              detail: {
                code: "CATEGORY_CHANGE_REQUIRES_CONFIRMATION",
                message: "B3 requiere confirmación.",
                conteos: { productos_directos: 2 },
                acciones_permitidas: ["previsualizar"],
              },
            },
          },
        };
      throw new Error(`Solicitud inesperada: ${String(url)}`);
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <CategoriasPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole("button", { name: "Nueva categoría" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), payload.nombre);
    await user.click(screen.getByRole("combobox", { name: "Categoría padre" }));
    await user.click(within(screen.getByRole("listbox")).getByText("Categoría padre"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar reclasificación" }));

    expect(screen.getByRole("heading", { name: "Nueva categoría" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar reclasificación" })).not.toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(4);
    expect(api.post).toHaveBeenLastCalledWith("/categorias/previsualizar", payload);
  });

  it("previsualiza y confirma B3 al mover una categoría con productos directos", async () => {
    const user = userEvent.setup();
    const destination = {
      ...parent,
      id: "destination",
      nombre: "Destino",
      tiene_hijos: false,
      es_padre: false,
      hijos: [],
    };
    const preview = {
      operacion: "MOVE_CATEGORY_B3",
      resumen: "Se reclasificará 1 producto directo.",
      conteos: { productos_directos: 1 },
      requiere_confirmacion: true,
      acciones_permitidas: ["confirmar", "cancelar"],
      precondicion_preview: "move-b3-token",
    };
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol")
        return { data: [{ ...parent }, destination] } as never;
      const effectiveResponse = effectiveRouteResponse(String(url));
      if (effectiveResponse) return effectiveResponse as never;
      if (url === "/atributos") return { data: { items: [] } } as never;
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
    });
    vi.mocked(api.put).mockImplementation(async (url, body) => {
      if (url === "/categorias/child" && !("payload" in (body as object)))
        throw {
          response: {
            status: 409,
            data: {
              detail: {
                code: "CATEGORY_CHANGE_REQUIRES_CONFIRMATION",
                message: "B3 requiere confirmación.",
                conteos: { productos_directos: 1 },
                acciones_permitidas: ["previsualizar"],
              },
            },
          },
        };
      return { data: { ...child, parent_id: destination.id } } as never;
    });
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (url === "/categorias/child/previsualizar")
        return { data: preview } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
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
    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    const childRow = screen.getByRole("button", { name: "Subcategoría" }).parentElement;
    await user.click(within(childRow!).getByTitle("Editar categoría"));
    const parentSelector = screen.getByRole("combobox", { name: "Categoría padre" });
    await user.click(parentSelector);
    await user.click(within(screen.getByRole("listbox")).getByText("Destino"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await user.click(screen.getByRole("button", { name: "Mover categoría" }));
    expect(await screen.findByRole("heading", { name: "Reclasificar productos directos" })).toBeInTheDocument();
    expect(screen.getByText(/1 productos? pasarán/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar reclasificación" }));
    await waitFor(() =>
      expect(api.put).toHaveBeenLastCalledWith("/categorias/child", {
        payload: { nombre: child.nombre, parent_id: destination.id },
        confirmar_b3: true,
        precondicion_preview: "move-b3-token",
      }),
    );
  });

  it("conserva la ruta completa del selector al llegar a un nieto", async () => {
    const user = userEvent.setup();
    const laptop = {
      ...child,
      id: "laptop",
      nombre: "Laptop",
      parent_id: child.id,
      tiene_hijos: false,
      es_padre: false,
      hijos: [],
    };
    const childNode = {
      ...child,
      tiene_hijos: true,
      es_padre: true,
      hijos: [laptop],
    };
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol")
        return { data: [{ ...parent, hijos: [childNode] }] } as never;
      const effectiveResponse = effectiveRouteResponse(String(url));
      if (effectiveResponse) return effectiveResponse as never;
      if (url === "/atributos") return { data: { items: [] } } as never;
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
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
    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: "Expandir Subcategoría" }));
    await user.click(screen.getByRole("button", { name: "Crear subcategoría en Laptop" }));
    expect(screen.getByRole("combobox", { name: "Categoría padre" })).toHaveTextContent(
      "Categoría padre › Subcategoría › Laptop",
    );
  });

  it("mueve una categoría a raíz con parent_id null sin enviar es_padre", async () => {
    const user = userEvent.setup();
    vi.mocked(api.put).mockResolvedValue({
      data: { ...child, parent_id: null },
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
    const childRow = screen.getByRole("button", { name: /^Subcategoría$/ })
      .parentElement;
    expect(childRow).not.toBeNull();
    await user.click(within(childRow!).getByTitle("Editar categoría"));
    const parentSelector = screen.getByRole("combobox", {
      name: "Categoría padre",
    });
    await user.click(parentSelector);
    const tree = screen.getByRole("listbox");
    await user.click(within(tree).getByText("Sin padre, categoría principal"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await user.click(screen.getByRole("button", { name: "Mover categoría" }));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/categorias/child",
        expect.objectContaining({ nombre: child.nombre, parent_id: null }),
      ),
    );
    expect(vi.mocked(api.put).mock.calls[0][1]).not.toHaveProperty("es_padre");
  });

  it("muestra Sin clasificar como temporal y sin acciones manuales", async () => {
    const temporary = {
      ...child,
      id: "temporary",
      nombre: "Sin clasificar",
      is_default: true,
      parent_id: parent.id,
    };
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol")
        return { data: [{ ...parent, hijos: [child, temporary] }] } as never;
      const effectiveResponse = effectiveRouteResponse(String(url));
      if (effectiveResponse) return effectiveResponse as never;
      if (url === "/atributos") return { data: { items: [] } } as never;
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
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
    await userEvent.setup().click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    expect(await screen.findByText("Temporal")).toBeInTheDocument();
    expect(screen.getAllByTitle("Dar de baja categoría")).toHaveLength(2);
    const bucketRow = screen.getByRole("button", { name: "Sin clasificar" }).parentElement;
    expect(bucketRow).not.toBeNull();
    expect(within(bucketRow!).getByRole("button", { name: "Sin clasificar" })).toBeDisabled();
    expect(within(bucketRow!).queryByTitle("Editar categoría")).not.toBeInTheDocument();
    expect(within(bucketRow!).queryByTitle("Crear subcategoría en Sin clasificar")).not.toBeInTheDocument();
    expect(within(bucketRow!).queryByTitle("Dar de baja categoría")).not.toBeInTheDocument();
  });

  it("reactiva una categoría ordinaria desde historial con su ID existente", async () => {
    const user = userEvent.setup();
    let inactive = true;
    const historical = { ...child, id: "historical", activo: false };
    vi.mocked(api.get).mockImplementation(async (url, config) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol") return { data: [parent] } as never;
      if (url === "/categorias" && config?.params?.only_active === false)
        return { data: { items: inactive ? [historical] : [parent] } } as never;
      const effectiveResponse = effectiveRouteResponse(String(url));
      if (effectiveResponse) return effectiveResponse as never;
      if (url === "/atributos") return { data: { items: [] } } as never;
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
    });
    vi.mocked(api.post).mockImplementation(async (url) => {
      if (url === "/categorias/historical/reactivar") {
        inactive = false;
        return { data: { ...historical, activo: true } } as never;
      }
      throw new Error(`Solicitud inesperada: ${String(url)}`);
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
    await user.click(await screen.findByRole("button", { name: "Historial" }));
    await user.click(
      await screen.findByRole("button", { name: "Reactivar" }),
    );
    expect(api.post).toHaveBeenCalledWith("/categorias/historical/reactivar");
    await waitFor(() =>
      expect(screen.getByText("No hay categorías inactivas.")).toBeInTheDocument(),
    );
  });

  it("muestra el 409 histórico de categoría y conserva el diálogo y el borrador sin duplicar filas", async () => {
    const user = userEvent.setup();
    const duplicateMessage =
      "Ya existe una categoria activa o inactiva con ese nombre dentro de la misma categoria padre. Reactiva o renombra la existente.";
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          detail: {
            code: "CATEGORY_DUPLICATE_NAME",
            message: duplicateMessage,
            acciones_permitidas: ["reactivar", "renombrar"],
          },
        },
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <>
        <Toaster />
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <CategoriasPage />
          </QueryClientProvider>
        </MemoryRouter>
      </>,
    );

    await screen.findByRole("button", { name: "Categoría padre" });
    await user.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const dialog = screen.getByRole("dialog");
    const nameInput = within(dialog).getByRole("textbox", { name: "Nombre" });
    await user.type(nameInput, "Categoría padre");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(duplicateMessage)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nueva categoría" })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByRole("textbox", { name: "Nombre" })).toHaveValue("Categoría padre");
    expect(
      queryClient
        .getQueryData<{
          id: string;
          nombre: string;
          hijos?: { id: string; nombre: string }[];
        }[]>(["categorias-arbol", "actor"])
        ?.flatMap((category) => [category, ...(category.hijos ?? [])])
        .filter((category) => category.nombre === "Categoría padre"),
    ).toHaveLength(1);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith("/categorias", {
      nombre: "Categoría padre",
      parent_id: undefined,
    });
    expect(vi.mocked(api.get).mock.calls.filter(([url]) => url === "/categorias/arbol")).toHaveLength(1);
  });

  it("muestra el 409 de asignación y conserva la configuración y la única fila existente", async () => {
    const user = userEvent.setup();
    const duplicateMessage =
      "El atributo ya esta asignado a la categoria. Si la asignacion esta inactiva, reactiva la existente.";
    vi.mocked(api.post).mockResolvedValue(categoryAttributePreview());
    vi.mocked(api.post).mockResolvedValue(categoryAttributePreview());
    vi.mocked(api.put).mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          detail: {
            code: "ATTRIBUTE_ALREADY_ASSIGNED",
            message: duplicateMessage,
            acciones_permitidas: ["reactivar"],
          },
        },
      },
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
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: "Obligatorio en esta categoría",
      }),
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "Valor por defecto (opcional)" }),
      "12",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar configuración" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Confirmar configuración" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(duplicateMessage);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("heading", {
      name: "Configurar atributo Atributo de la subcategoría en categoría Subcategoría",
    })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByRole("checkbox", {
      name: "Obligatorio en esta categoría",
    })).toBeChecked();
    expect(within(screen.getByRole("dialog")).getByRole("textbox", {
      name: "Valor por defecto (opcional)",
    })).toHaveValue("12");
    expect(screen.getAllByText("Atributo de la subcategoría")).toHaveLength(1);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith(
      "/categorias/child/atributos/assignment-child",
      {
        orden: null,
        obligatorio: true,
        valor_default: "12",
        aplicar_default_a_existentes: false,
        precondicion_preview: "signed-preview",
      },
    );
  });

  it("busca y asigna una definición existente desde el modal Agregar atributo", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      data: effectiveAttributesFor(child.id)[0],
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
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(screen.getByRole("button", { name: "Agregar atributo" }));
    await user.type(
      screen.getByRole("textbox", { name: "Buscar atributo existente" }),
      "cm",
    );
    const existingAttribute = screen.getByRole("button", {
      name: /Atributo del padre/,
    });
    expect(existingAttribute).toHaveTextContent("cm (Centímetro)");
    await user.click(existingAttribute);
    await user.click(screen.getByRole("button", { name: "Asignar atributo" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        `/categorias/${child.id}/atributos`,
        { atributo_id: "attribute-parent" },
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("previsualiza y confirma el backfill al crear un atributo obligatorio nuevo", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockImplementation(async (url) =>
      String(url) === "/atributos/previsualizar"
        ? categoryAttributePreview([
            { id: "product-missing", nombre: "Televisor", motivo: "Sin valor activo" },
          ])
        : ({ data: { id: "attribute-new" } } as never),
    );
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
    await user.click(screen.getByRole("button", { name: "Agregar atributo" }));
    await user.click(screen.getByRole("button", { name: "Crear nuevo" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Panel");
    await user.click(
      screen.getByRole("checkbox", { name: "Obligatorio en esta categoría" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Valor por defecto (opcional)" }),
      "IPS",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "Aplicar el default a productos existentes sin valor",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Crear y asignar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/atributos/previsualizar",
        expect.objectContaining({
          categoria_id: child.id,
          nombre: "Panel",
          obligatorio: true,
          valor_default: "IPS",
          aplicar_default_a_existentes: true,
        }),
      ),
    );

    expect(await screen.findByText(/1 de 2 productos activos carecen de un valor válido/)).toBeInTheDocument();
    expect(await screen.findByText(/Televisor/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Crear y aplicar a faltantes" }),
    );

    await waitFor(() =>
      expect(api.post).toHaveBeenNthCalledWith(
        1,
        "/atributos/previsualizar",
        expect.objectContaining({
          categoria_id: child.id,
          nombre: "Panel",
          tipo_dato: "string",
          obligatorio: true,
          valor_default: "IPS",
          aplicar_default_a_existentes: true,
        }),
      ),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenNthCalledWith(
        2,
        "/atributos",
        expect.objectContaining({
          categoria_id: child.id,
          nombre: "Panel",
          obligatorio: true,
          valor_default: "IPS",
          aplicar_default_a_existentes: true,
          precondicion_preview: "signed-preview",
        }),
      ),
    );
  });

  it("crea un atributo numérico con unidad separada del default", async () => {
    const user = userEvent.setup();
    includeUnitReadPermission = true;
    vi.mocked(api.post).mockResolvedValue({ data: { id: "attribute-new" } } as never);
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
    await user.click(screen.getByRole("button", { name: "Agregar atributo" }));
    await user.click(screen.getByRole("button", { name: "Crear nuevo" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Memoria RAM");
    expect(
      screen.queryByRole("checkbox", { name: "Usa unidad" }),
    ).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tipo de dato" }),
      "integer",
    );
    const usesUnit = await screen.findByRole("checkbox", { name: "Usa unidad" });
    expect(usesUnit).not.toBeChecked();
    await user.click(usesUnit);
    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Unidad" }),
      "unit-gb",
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "Valor por defecto (opcional)" }),
      "16",
    );
    await user.click(screen.getByRole("button", { name: "Crear y asignar" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/atributos",
        expect.objectContaining({
          categoria_id: child.id,
          nombre: "Memoria RAM",
          tipo_dato: "integer",
          unidad_id: "unit-gb",
          valor_default: "16",
        }),
      ),
    );
    const createPayload = vi.mocked(api.post).mock.calls.find(
      ([url]) => url === "/atributos",
    )?.[1] as Record<string, unknown>;
    expect(createPayload).not.toHaveProperty("usa_unidad");
    expect(JSON.stringify(createPayload)).not.toContain("GB");
  });

  it("precarga la unidad del atributo al abrir su edición global", async () => {
    const user = userEvent.setup();
    includeUnitReadPermission = true;
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
      screen.getByRole("button", { name: "Acciones de Atributo del padre" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Editar definición global" }),
    );

    expect(await screen.findByRole("checkbox", { name: "Usa unidad" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Unidad" })).toHaveValue("unit-cm");
  });

  it("envía unidad_id null al solicitar quitar la unidad de una definición", async () => {
    const user = userEvent.setup();
    includeUnitReadPermission = true;
    vi.mocked(api.post).mockResolvedValue({
      data: {
        asignaciones_activas: 0,
        valores_activos: 0,
        productos_afectados: 0,
        convertibles: 0,
        incompatibles: [],
        remapeos_pendientes: 0,
      },
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
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(
      screen.getByRole("button", { name: "Acciones de Atributo del padre" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Editar definición global" }),
    );
    await user.click(await screen.findByRole("checkbox", { name: "Usa unidad" }));
    await user.click(screen.getByRole("button", { name: "Previsualizar cambios" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/atributos/attribute-parent/previsualizar",
        expect.objectContaining({ unidad_id: null }),
      ),
    );
    const previewPayload = vi.mocked(api.post).mock.calls.find(
      ([url]) => url === "/atributos/attribute-parent/previsualizar",
    )?.[1] as Record<string, unknown>;
    expect(previewPayload).not.toHaveProperty("usa_unidad");
  });

  it("muestra PRODUCT_REQUIRED_ATTRIBUTES_MISSING y no confirma una conversión requerida incompatible", async () => {
    const user = userEvent.setup();
    childRequired = true;
    vi.mocked(api.post).mockRejectedValue({
      response: {
        status: 409,
        data: {
          detail: {
            code: "PRODUCT_REQUIRED_ATTRIBUTES_MISSING",
            message: "La conversión dejaría un producto obligatorio sin valor válido.",
            conteos: { productos: 1 },
            affected_ids: ["product-1"],
            acciones_permitidas: ["proporcionar_valores", "cancelar"],
          },
        },
      },
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
      screen.getByRole("menuitem", { name: "Editar definición global" }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tipo de dato" }),
      "integer",
    );
    await user.click(screen.getByRole("button", { name: "Previsualizar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "PRODUCT_REQUIRED_ATTRIBUTES_MISSING",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Tipo de dato" })).toHaveValue(
      "integer",
    );
    expect(api.put).not.toHaveBeenCalled();
  });

  it("guarda la configuración heredada como override local con el mismo atributo", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockImplementation(async (url) =>
      String(url).endsWith("/previsualizar")
        ? categoryAttributePreview()
        : ({ data: {} } as never),
    );
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
      screen.getByRole("button", { name: "Acciones de Atributo del padre" }),
    );
    await user.click(
      screen.getByRole("menuitem", {
        name: "Sobrescribir configuración aquí",
      }),
    );
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: "Obligatorio en esta categoría",
      }),
    );
    await user.type(
      within(dialog).getByRole("spinbutton", { name: "Valor por defecto (opcional)" }),
      "16",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar configuración" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Confirmar configuración" }),
    );

    await waitFor(() =>
      expect(api.post).toHaveBeenNthCalledWith(
        1,
        `/categorias/${child.id}/atributos/previsualizar`,
        {
          atributo_id: "attribute-parent",
          orden: null,
          obligatorio: true,
          valor_default: "16",
          aplicar_default_a_existentes: false,
        },
      ),
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      `/categorias/${child.id}/atributos`,
      {
        atributo_id: "attribute-parent",
        orden: null,
        obligatorio: true,
        valor_default: "16",
        aplicar_default_a_existentes: false,
        precondicion_preview: "signed-preview",
      },
    );
    expect(api.put).not.toHaveBeenCalled();
  });

  it("limpia un default opcional y guarda un orden local sin volverlo obligatorio", async () => {
    const user = userEvent.setup();
    childDefault = "12 meses";
    vi.mocked(api.put).mockImplementation(async (_url, payload) => {
      const updatePayload = payload as {
        valor_default: string | null;
        obligatorio: boolean;
      };
      childDefault = updatePayload.valor_default;
      childRequired = updatePayload.obligatorio;
      return { data: {} } as never;
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
    await user.clear(
      screen.getByRole("textbox", { name: "Valor por defecto (opcional)" }),
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "Orden (opcional)" }),
      "3",
    );
    await user.click(screen.getByRole("button", { name: "Guardar configuración" }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/categorias/child/atributos/assignment-child",
        {
          orden: 3,
          obligatorio: false,
          valor_default: null,
          aplicar_default_a_existentes: false,
        },
      ),
    );
  });

  it("previsualiza quitar un mapping propio y preserva EAV aún aplicable", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      data: {
        operacion: "REMOVE_CATEGORY_ATTRIBUTE",
        resumen: "Se conservarán 2 valores aún aplicables y se desactivarán 0 valores.",
        conteos: {
          productos_afectados: 2,
          productos_faltantes: 0,
          valores_conservados: 2,
          valores_desactivados: 0,
        },
        faltantes: [],
        requiere_confirmacion: true,
        acciones_permitidas: ["confirmar", "cancelar"],
        precondicion_preview: "signed-preview",
      },
    } as never);
    vi.mocked(api.delete).mockResolvedValue({
      data: { mapping_id: "assignment-child", valores_desactivados: 0 },
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
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(
      screen.getByRole("button", {
        name: "Acciones de Atributo de la subcategoría",
      }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Quitar de esta categoría" }),
    );

    await user.click(
      await screen.findByRole("button", { name: "Quitar de esta categoría" }),
    );
    expect(api.post).toHaveBeenCalledWith(
      `/categorias/${child.id}/atributos/assignment-child/previsualizar-remocion`,
    );
    expect(api.delete).toHaveBeenCalledWith(
      `/categorias/${child.id}/atributos/assignment-child`,
      {
        data: { confirmar: true, precondicion_preview: "signed-preview" },
      },
    );
    expect(api.delete).not.toHaveBeenCalledWith("/atributos/attribute-child");
  });

  it("bloquea el retiro local cuando el preview contiene remapeos pendientes", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      data: {
        operacion: "REMOVE_CATEGORY_ATTRIBUTE",
        resumen: "Hay un remapeo pendiente.",
        conteos: {
          productos_afectados: 1,
          valores_conservados: 0,
          valores_desactivados: 1,
          productos_faltantes: 0,
        },
        faltantes: [],
        remapeos: [
          { id: "remap-1", nombre: "Televisor", motivo: "Conversión pendiente" },
        ],
        requiere_confirmacion: true,
        acciones_permitidas: ["resolver_remapeos", "cancelar"],
        precondicion_preview: "signed-preview",
      },
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
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(
      screen.getByRole("button", {
        name: "Acciones de Atributo de la subcategoría",
      }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Quitar de esta categoría" }),
    );

    expect(api.post).toHaveBeenCalledWith(
      `/categorias/${child.id}/atributos/assignment-child/previsualizar-remocion`,
    );
    expect(await screen.findByText("Hay un remapeo pendiente.")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent(
      "Televisor: Conversión pendiente",
    );
    expect(
      screen.getByRole("button", { name: "Quitar de esta categoría" }),
    ).toBeDisabled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("permite hacer obligatorio un atributo sin default y sin backfill implícito", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue(categoryAttributePreview());
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
    await user.click(
      screen.getByRole("menuitem", { name: "Configurar categoría" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Obligatorio en esta categoría" }),
    );
    await user.click(screen.getByRole("button", { name: "Guardar configuración" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirmar configuración" }),
    );

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        "/categorias/child/atributos/assignment-child",
        {
          orden: null,
          obligatorio: true,
          valor_default: null,
          aplicar_default_a_existentes: false,
          precondicion_preview: "signed-preview",
        },
      ),
    );
  });

  it("refresca un preview stale sin mutar y confirma solo tras un segundo consentimiento", async () => {
    const user = userEvent.setup();
    const previewResponse = (token: string) => ({
      data: {
        operacion: "UPDATE_CATEGORY_ATTRIBUTE",
        resumen: "No hay faltantes entre 2 productos activos afectados.",
        conteos: { productos_afectados: 2, productos_faltantes: 0 },
        faltantes: [],
        requiere_confirmacion: true,
        acciones_permitidas: ["confirmar", "cancelar"],
        precondicion_preview: token,
      },
    }) as never;
    vi.mocked(api.post)
      .mockResolvedValueOnce(previewResponse("preview-first"))
      .mockResolvedValueOnce(previewResponse("preview-refreshed"));
    vi.mocked(api.put)
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            detail: {
              code: "CATALOG_PREVIEW_STALE",
              message: "El preview venció.",
            },
          },
        },
      })
      .mockResolvedValueOnce({ data: {} } as never);
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
    await user.click(
      screen.getByRole("menuitem", { name: "Configurar categoría" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Obligatorio en esta categoría" }),
    );
    await user.click(screen.getByRole("button", { name: "Guardar configuración" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirmar configuración" }),
    );

    await waitFor(() =>
      expect(api.put).toHaveBeenNthCalledWith(
        1,
        "/categorias/child/atributos/assignment-child",
        {
          orden: null,
          obligatorio: true,
          valor_default: null,
          aplicar_default_a_existentes: false,
          precondicion_preview: "preview-first",
        },
      ),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenNthCalledWith(
        2,
        "/categorias/child/atributos/assignment-child/previsualizar",
        {
          orden: null,
          obligatorio: true,
          valor_default: null,
          aplicar_default_a_existentes: false,
        },
      ),
    );
    expect(api.put).toHaveBeenCalledTimes(1);
    await user.click(
      await screen.findByRole("button", { name: "Confirmar configuración" }),
    );
    await waitFor(() =>
      expect(api.put).toHaveBeenNthCalledWith(
        2,
        "/categorias/child/atributos/assignment-child",
        {
          orden: null,
          obligatorio: true,
          valor_default: null,
          aplicar_default_a_existentes: false,
          precondicion_preview: "preview-refreshed",
        },
      ),
    );
  });

  it("bloquea la confirmación con faltantes si no se autorizó backfill y conserva el draft", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue(
      categoryAttributePreview([
        { id: "product-missing", nombre: "Televisor", motivo: "Sin valor activo" },
      ]),
    );
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
    await user.click(
      screen.getByRole("menuitem", { name: "Configurar categoría" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Obligatorio en esta categoría" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Valor por defecto (opcional)" }),
      "IPS",
    );
    await user.click(screen.getByRole("button", { name: "Guardar configuración" }));

    expect(await screen.findByText(/Televisor/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar configuración" }),
    ).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("heading", {
      name: "Configurar atributo Atributo de la subcategoría en categoría Subcategoría",
    })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {
      name: "Obligatorio en esta categoría",
    })).toBeChecked();
    expect(screen.getByRole("textbox", {
      name: "Valor por defecto (opcional)",
    })).toHaveValue("IPS");
  });

  it("mantiene el diálogo si el backend rechaza una asignación duplicada", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue({
      response: {
        status: 409,
        data: { detail: { code: "ATTRIBUTE_ALREADY_ASSIGNED" } },
      },
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

    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    await user.click(screen.getByRole("button", { name: "Agregar atributo" }));
    await user.type(
      screen.getByRole("textbox", { name: "Buscar atributo existente" }),
      "Atributo del padre",
    );
    await user.click(
      screen.getByRole("button", { name: /Atributo del padre/ }),
    );
    await user.click(screen.getByRole("button", { name: "Asignar atributo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Este atributo ya está asignado a la categoría.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("muestra lecturas aditivas de atributos y conserva sus IDs en fetch y refetch", async () => {
    const user = userEvent.setup();
    let attributeReads = [
      {
        id: "attribute-parent",
        nombre: "Atributo del padre",
        tipo_dato: "string",
        codigo: "atributo_padre",
        unidad_id: null,
        activo: true,
      },
      {
        id: "attribute-child",
        nombre: "Atributo de la subcategoría",
        tipo_dato: "string",
        codigo: "atributo_subcategoria",
        unidad_id: null,
        activo: true,
      },
    ];
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return { data: categoryPermissions } as never;
      if (url === "/categorias/arbol") return { data: [parent] } as never;
      const effectiveResponse = effectiveRouteResponse(
        String(url),
        assignments,
        attributeReads[1].nombre,
      );
      if (effectiveResponse) return effectiveResponse as never;
      if (url === "/atributos")
        return { data: { items: attributeReads } } as never;
      if (url === "/catalogos") return { data: [] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
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

    await user.click(
      await screen.findByRole("button", { name: "Expandir Categoría padre" }),
    );
    await user.click(screen.getByRole("button", { name: /^Subcategoría$/ }));
    expect(
      await screen.findByText("Atributo de la subcategoría"),
    ).toBeInTheDocument();
    const cachedAttributes = () =>
      queryClient.getQueryData<{ id: string }[]>(["atributos-canonicos", "actor"]);
    expect(cachedAttributes()?.map((attribute) => attribute.id)).toEqual([
      "attribute-parent",
      "attribute-child",
    ]);
    expect(cachedAttributes()?.[1]).toMatchObject({
      codigo: "atributo_subcategoria",
      unidad_id: null,
      activo: true,
    });
    const effectiveCacheKey = [
      "categoria-atributos",
      "actor",
      child.id,
      "effective",
    ];
    expect(
      queryClient
        .getQueryData<CategoriaAtributoEfectivo[]>(effectiveCacheKey)
        ?.map((assignment) => assignment.mapping_id),
    ).toEqual(["assignment-child", "assignment-parent"]);

    attributeReads = attributeReads.map((attribute) => ({
      ...attribute,
      actualizado_en: "2026-10-25T12:00:00Z",
    }));
    await queryClient.invalidateQueries({
      queryKey: ["atributos-canonicos"],
    });
    await queryClient.invalidateQueries({ queryKey: effectiveCacheKey });

    expect(vi.mocked(api.get).mock.calls.filter(([url]) => url === "/atributos")).toHaveLength(2);
    expect(
      vi.mocked(api.get).mock.calls.filter(
        ([url]) =>
          url === `/categorias/${child.id}/atributos-efectivos`,
      ),
    ).toHaveLength(2);
    expect(cachedAttributes()?.map((attribute) => attribute.id)).toEqual([
      "attribute-parent",
      "attribute-child",
    ]);
    expect(cachedAttributes()?.[1]).toHaveProperty(
      "actualizado_en",
      "2026-10-25T12:00:00Z",
    );
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("no consulta atributos ni asignaciones si falta el permiso combinado de lectura", async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "/usuarios/actor/permisos")
        return {
          data: [
            {
              codigo: "CATEGORIAS",
              nombre: "Categorías",
              puede_leer: true,
              puede_crear: false,
              puede_actualizar: false,
              puede_eliminar: false,
            },
          ],
        } as never;
      if (url === "/categorias/arbol") return { data: [parent] } as never;
      throw new Error(`Solicitud inesperada: ${String(url)}`);
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
    await userEvent.setup().click(
      await screen.findByRole("button", { name: "Categoría padre" }),
    );
    expect(
      await screen.findByText("No tienes permiso para consultar atributos de categoría."),
    ).toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls.some(([url]) => url === "/atributos")).toBe(false);
    expect(vi.mocked(api.get).mock.calls.some(([url]) => url === "/categorias-atributos")).toBe(false);
    expect(
      vi.mocked(api.get).mock.calls.some(([url]) =>
        String(url).includes("/atributos-efectivos"),
      ),
    ).toBe(false);
    expect(
      vi.mocked(api.get).mock.calls.some(([url]) =>
        String(url).includes("/atributos-propios"),
      ),
    ).toBe(false);
  });
});
