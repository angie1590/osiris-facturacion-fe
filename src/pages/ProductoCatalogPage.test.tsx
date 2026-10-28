import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProductoIntegral,
  getAtributosEfectivos,
  getCategoriasSeleccionables,
  getImpuestosPermitidos,
  getProducto,
  getProductos,
  previewCambioCategoriaProducto,
  updateProductoIntegral,
} from "@/features/productos/api";
import { useCatalogPermissions } from "@/features/categorias/useCatalogPermissions";
import ProductoCatalogPage from "./ProductoCatalogPage";

vi.mock("@/features/productos/api", () => ({
  createProductoIntegral: vi.fn(),
  getAtributosEfectivos: vi.fn(),
  getBodegas: vi.fn(),
  getCategoriasSeleccionables: vi.fn(),
  getImpuestosPermitidos: vi.fn(),
  getProducto: vi.fn(),
  getProductos: vi.fn(),
  getProveedoresPersona: vi.fn(),
  getProveedoresSociedad: vi.fn(),
  previewCambioCategoriaProducto: vi.fn(),
  saveProductoBodega: vi.fn(),
  saveProductoProveedores: vi.fn(),
  updateProductoIntegral: vi.fn(),
}));

vi.mock("@/features/categorias/useCatalogPermissions", () => ({
  useCatalogPermissions: vi.fn(),
}));

const productDetail = {
  id: "product-1",
  nombre: "Teclado",
  descripcion: "Mecánico",
  codigo_barras: "123",
  tipo: "BIEN" as const,
  pvp: "25.00",
  cantidad: "0",
  permite_fracciones: false,
  categoria_principal: { id: "category-1", nombre: "Periféricos" },
  categoria_ruta: [{ id: "category-1", nombre: "Periféricos" }],
  categorias: [{ id: "category-1", nombre: "Periféricos" }],
  atributos: [],
  bodegas: [],
  proveedores_persona: [],
  proveedores_sociedad: [],
  impuestos: [{ id: "tax-iva", tipo_impuesto: "IVA" as const, nombre: "IVA 15%", codigo: "2", porcentaje: "15" }],
};

const categoryAttribute = (categoryId: string) => [{
  atributo_id: categoryId === "category-2" ? "attribute-2" : "attribute-1",
  codigo: "material",
  nombre: "Material",
  tipo_dato: "string",
  unidad_id: null,
  unidad: null,
  restricciones: { allow_negative: false, min_value: null, max_value: null },
  select_options: null,
  catalog_id: null,
  obligatorio: true,
  valor_default: null,
  orden: 1,
  categoria_origen: { id: categoryId, nombre: categoryId === "category-2" ? "Teclados" : "Periféricos" },
  profundidad: 0,
  heredado: false,
}];

function renderPage(path = "/productos") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <ProductoCatalogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("flujo canónico de Productos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCatalogPermissions).mockReturnValue({
      actor: "user-1",
      context: {
        actor: "user-1",
        permissionsActor: "user-1",
        status: "listo",
        permissions: [{
          codigo: "PRODUCTOS",
          nombre: "Productos",
          puede_leer: true,
          puede_crear: true,
          puede_actualizar: true,
          puede_eliminar: false,
        }],
      },
      permissions: { isPending: false, isError: false, refetch: vi.fn() },
    } as never);
    vi.mocked(getProductos).mockResolvedValue({ items: [], meta: { total: 0, limit: 1000, offset: 0, page: 1, page_count: 0 } });
    vi.mocked(getCategoriasSeleccionables).mockResolvedValue([
      { id: "category-1", nombre: "Periféricos" },
      { id: "category-2", nombre: "Teclados" },
    ]);
    vi.mocked(getImpuestosPermitidos).mockResolvedValue([
      { id: "tax-iva", tipo_impuesto: "IVA", descripcion: "IVA 15%", codigo_sri: "2" },
    ]);
    vi.mocked(getAtributosEfectivos).mockImplementation(async (id) => categoryAttribute(id) as never);
    vi.mocked(getProducto).mockResolvedValue(productDetail as never);
    vi.mocked(createProductoIntegral).mockResolvedValue(productDetail as never);
    vi.mocked(updateProductoIntegral).mockResolvedValue(productDetail as never);
    vi.mocked(previewCambioCategoriaProducto).mockResolvedValue({
      operacion: "UPDATE_PRODUCT_CATEGORY",
      producto_id: "product-1",
      categoria_actual_id: "category-1",
      categoria_actual_ruta: "Periféricos",
      categoria_destino_id: "category-2",
      categoria_destino_ruta: "Teclados",
      resumen: "Cambio compatible.",
      conteos: { conservados: 0, desactivados: 0, defaults_disponibles: 0, faltantes: 0, incompatibles: 0 },
      conservados: [],
      desactivados: [],
      defaults: [],
      faltantes: [],
      incompatibles: [],
      requiere_confirmacion: true,
      acciones_permitidas: ["confirmar", "cancelar"],
      precondicion_preview: "signed-preview-token",
    });
  });

  it("crea con una mutación integral y valores EAV tipados", async () => {
    const user = userEvent.setup();
    renderPage();

    const newProductButton = await screen.findByRole("button", { name: "Nuevo producto" });
    fireEvent.click(newProductButton);
    await waitFor(() => {
      expect(getCategoriasSeleccionables).toHaveBeenCalled();
      expect(getImpuestosPermitidos).toHaveBeenCalled();
    });
    await user.type(await screen.findByLabelText(/Nombre/), "Teclado nuevo");
    await user.type(screen.getByLabelText(/PVP/), "12.5");
    await user.selectOptions(screen.getByLabelText(/Categoría principal/), "category-1");
    await user.selectOptions(screen.getByLabelText(/IVA/), "tax-iva");
    await user.type(await screen.findByLabelText(/Material/), "Aluminio");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(createProductoIntegral).toHaveBeenCalledExactlyOnceWith({
      nombre: "Teclado nuevo",
      descripcion: null,
      codigo_barras: null,
      tipo: "BIEN",
      pvp: 12.5,
      permite_fracciones: false,
      categoria_principal_id: "category-1",
      impuesto_catalogo_ids: ["tax-iva"],
      atributos: [{ atributo_id: "attribute-1", valor: "Aluminio" }],
    }));
  });

  it("abre el formulario canónico desde el deep link de alta", async () => {
    renderPage("/productos?accion=nuevo");

    expect(await screen.findByLabelText(/Nombre/)).toBeInTheDocument();
  });

  it("oculta el control ICE cuando la empresa no tiene tarifas ICE habilitadas", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo producto" }));

    expect(await screen.findByLabelText(/IVA/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^ICE$/)).not.toBeInTheDocument();
  });

  it("muestra el control ICE cuando la empresa tiene tarifas ICE habilitadas", async () => {
    const user = userEvent.setup();
    vi.mocked(getImpuestosPermitidos).mockResolvedValue([
      { id: "tax-iva", tipo_impuesto: "IVA", descripcion: "IVA 15%", codigo_sri: "2" },
      { id: "tax-ice", tipo_impuesto: "ICE", descripcion: "ICE prueba", codigo_sri: "3011" },
    ]);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo producto" }));

    expect(await screen.findByLabelText(/^ICE$/)).toBeInTheDocument();
  });

  it("muestra defaults explícitos pero deja que backend los aplique", async () => {
    const user = userEvent.setup();
    vi.mocked(getAtributosEfectivos).mockImplementation(async (id) => [
      { ...categoryAttribute(id)[0], valor_default: "Acero" },
    ] as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo producto" }));
    await user.type(await screen.findByLabelText(/Nombre/), "Teclado con default");
    await user.type(screen.getByLabelText(/PVP/), "12.5");
    await user.selectOptions(screen.getByLabelText(/Categoría principal/), "category-1");
    await user.selectOptions(screen.getByLabelText(/IVA/), "tax-iva");
    expect(await screen.findByLabelText(/Material/)).toHaveValue("Acero");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(createProductoIntegral).toHaveBeenCalledWith(
      expect.objectContaining({ atributos: [] }),
    ));
  });

  it("muestra la unidad como sufijo y transmite solo el valor numérico", async () => {
    const user = userEvent.setup();
    vi.mocked(getAtributosEfectivos).mockImplementation(async (id) => [{
      ...categoryAttribute(id)[0],
      tipo_dato: "decimal",
      unidad_id: "unit-kg",
      unidad: { id: "unit-kg", codigo: "kg", nombre: "Kilogramo", simbolo: "kg", magnitud_codigo: "masa" },
      restricciones: { allow_negative: false, min_value: null, max_value: "25" },
    }] as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo producto" }));
    await user.type(await screen.findByLabelText(/Nombre/), "Producto pesado");
    await user.type(screen.getByLabelText(/PVP/), "12.5");
    await user.selectOptions(screen.getByLabelText(/Categoría principal/), "category-1");
    await user.selectOptions(screen.getByLabelText(/IVA/), "tax-iva");
    await user.type(await screen.findByLabelText(/Material/), "1.25");
    expect(screen.getByText("Unidad: kg")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(createProductoIntegral).toHaveBeenCalledWith(
      expect.objectContaining({ atributos: [{ atributo_id: "attribute-1", valor: 1.25 }] }),
    ));
  });

  it("previsualiza y confirma cambio de categoría con el token vigente", async () => {
    const user = userEvent.setup();
    vi.mocked(getProductos).mockResolvedValue({
      items: [{ id: "product-1", nombre: "Teclado", tipo: "BIEN", pvp: "25.00", cantidad: "0" }],
      meta: { total: 1, limit: 1000, offset: 0, page: 1, page_count: 1 },
    });
    renderPage();

    await user.click(await within(screen.getByTestId("mobile-products")).findByRole("button", { name: "Editar" }));
    await screen.findByDisplayValue("Teclado");
    await user.selectOptions(await screen.findByLabelText(/Categoría principal/), "category-2");
    await user.type(await screen.findByLabelText(/Material/), "Acero");
    await user.click(screen.getByRole("button", { name: "Previsualizar cambio" }));

    const previewDialog = await screen.findByRole("dialog", { name: "Cambio de categoría" });
    expect(within(previewDialog).getByText("Periféricos → Teclados")).toBeInTheDocument();
    await user.click(within(previewDialog).getByRole("button", { name: "Confirmar y guardar" }));

    await waitFor(() => expect(updateProductoIntegral).toHaveBeenCalledExactlyOnceWith(
      "product-1",
      expect.objectContaining({
        categoria_principal_id: "category-2",
        precondicion_preview: "signed-preview-token",
        atributos: [{ atributo_id: "attribute-2", valor: "Acero" }],
      }),
    ));
  });

  it("muestra faltantes del preview y bloquea la confirmación", async () => {
    const user = userEvent.setup();
    vi.mocked(getProductos).mockResolvedValue({
      items: [{ id: "product-1", nombre: "Teclado", tipo: "BIEN", pvp: "25.00", cantidad: "0" }],
      meta: { total: 1, limit: 1000, offset: 0, page: 1, page_count: 1 },
    });
    vi.mocked(previewCambioCategoriaProducto).mockResolvedValue({
      operacion: "UPDATE_PRODUCT_CATEGORY",
      producto_id: "product-1",
      categoria_actual_id: "category-1",
      categoria_actual_ruta: "Periféricos",
      categoria_destino_id: "category-2",
      categoria_destino_ruta: "Teclados",
      resumen: "Falta completar Material.",
      conteos: { conservados: 0, desactivados: 0, defaults_disponibles: 0, faltantes: 1, incompatibles: 0 },
      conservados: [],
      desactivados: [],
      defaults: [],
      faltantes: [{ atributo_id: "attribute-2", codigo: "material", nombre: "Material", motivo: "Este valor es obligatorio." }],
      incompatibles: [],
      requiere_confirmacion: true,
      acciones_permitidas: ["completar_valores", "cancelar"],
      precondicion_preview: "signed-preview-token",
    });
    renderPage();

    await user.click(await within(screen.getByTestId("mobile-products")).findByRole("button", { name: "Editar" }));
    await screen.findByDisplayValue("Teclado");
    await user.selectOptions(screen.getByLabelText(/Categoría principal/), "category-2");
    await user.click(screen.getByRole("button", { name: "Previsualizar cambio" }));

    const previewDialog = await screen.findByRole("dialog", { name: "Cambio de categoría" });
    expect(within(previewDialog).getByText(/Material.*obligatorio/)).toBeInTheDocument();
    expect(within(previewDialog).getByRole("button", { name: "Confirmar y guardar" })).toBeDisabled();
    expect(updateProductoIntegral).not.toHaveBeenCalled();
  });

  it("invalida un preview stale sin perder el borrador y permite renovarlo", async () => {
    const user = userEvent.setup();
    vi.mocked(getProductos).mockResolvedValue({
      items: [{ id: "product-1", nombre: "Teclado", tipo: "BIEN", pvp: "25.00", cantidad: "0" }],
      meta: { total: 1, limit: 1000, offset: 0, page: 1, page_count: 1 },
    });
    vi.mocked(updateProductoIntegral).mockRejectedValue({
      response: { data: { detail: { code: "CATALOG_PREVIEW_STALE", message: "El preview venció." } } },
    });
    renderPage();

    await user.click(await within(screen.getByTestId("mobile-products")).findByRole("button", { name: "Editar" }));
    await screen.findByDisplayValue("Teclado");
    await user.selectOptions(screen.getByLabelText(/Categoría principal/), "category-2");
    await user.type(await screen.findByLabelText(/Material/), "Acero");
    await user.click(screen.getByRole("button", { name: "Previsualizar cambio" }));
    const previewDialog = await screen.findByRole("dialog", { name: "Cambio de categoría" });
    await user.click(within(previewDialog).getByRole("button", { name: "Confirmar y guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El catálogo cambió. Solicita un preview nuevo");
    expect(screen.getByLabelText(/Nombre/)).toHaveValue("Teclado");
    expect(screen.getByLabelText(/Material/)).toHaveValue("Acero");
    await user.click(screen.getByRole("button", { name: "Previsualizar cambio" }));
    await screen.findByRole("dialog", { name: "Cambio de categoría" });
    expect(previewCambioCategoriaProducto).toHaveBeenCalledTimes(2);
  });

  it("conserva el borrador cuando el servidor rechaza la alta", async () => {
    const user = userEvent.setup();
    vi.mocked(createProductoIntegral).mockRejectedValue({
      response: { data: { detail: { code: "PRODUCT_REQUIRED_ATTRIBUTES_MISSING", message: "Completa los atributos.", fields: { "atributos.attribute-1": "Este valor es obligatorio." } } } },
    });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo producto" }));
    await user.type(await screen.findByLabelText(/Nombre/), "Borrador conservado");
    await user.type(screen.getByLabelText(/PVP/), "15");
    await user.selectOptions(screen.getByLabelText(/Categoría principal/), "category-1");
    await user.selectOptions(screen.getByLabelText(/IVA/), "tax-iva");
    await user.type(await screen.findByLabelText(/Material/), "Acero");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Completa los atributos.");
    expect(screen.getByLabelText(/Nombre/)).toHaveValue("Borrador conservado");
    expect(screen.getByText("Este valor es obligatorio.")).toBeInTheDocument();
  });

  it("oculta mutaciones a un usuario con permisos efectivos de solo lectura", async () => {
    vi.mocked(useCatalogPermissions).mockReturnValue({
      actor: "reader-1",
      context: {
        actor: "reader-1",
        permissionsActor: "reader-1",
        status: "listo",
        permissions: [{
          codigo: "PRODUCTOS",
          nombre: "Productos",
          puede_leer: true,
          puede_crear: false,
          puede_actualizar: false,
          puede_eliminar: false,
        }],
      },
      permissions: { isPending: false, isError: false, refetch: vi.fn() },
    } as never);
    vi.mocked(getProductos).mockResolvedValue({
      items: [{ id: "product-1", nombre: "Teclado", tipo: "BIEN", pvp: "25.00", cantidad: "0" }],
      meta: { total: 1, limit: 1000, offset: 0, page: 1, page_count: 1 },
    });
    renderPage();

    expect(await within(screen.getByTestId("mobile-products")).findByText("Teclado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nuevo producto" })).not.toBeInTheDocument();
    expect(within(screen.getByTestId("mobile-products")).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("deniega la ruta cuando no existe permiso efectivo de lectura", async () => {
    vi.mocked(useCatalogPermissions).mockReturnValue({
      actor: "denied-1",
      context: {
        actor: "denied-1",
        permissionsActor: "denied-1",
        status: "listo",
        permissions: [],
      },
      permissions: { isPending: false, isError: false, refetch: vi.fn() },
    } as never);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Sin acceso" })).toBeInTheDocument();
    expect(getProductos).not.toHaveBeenCalled();
  });

  it("muestra error de permisos distinto de acceso denegado", async () => {
    vi.mocked(useCatalogPermissions).mockReturnValue({
      actor: "user-1",
      context: { actor: "user-1", status: "error" },
      permissions: { isPending: false, isError: true, refetch: vi.fn() },
    } as never);
    renderPage();

    expect(await screen.findByText("No se pudieron consultar tus permisos de Producto.")).toBeInTheDocument();
    expect(getProductos).not.toHaveBeenCalled();
  });

  it("identifica el endpoint fiscal cuando falla la carga de impuestos", async () => {
    const user = userEvent.setup();
    vi.mocked(getImpuestosPermitidos).mockRejectedValue({
      response: { data: { detail: { code: "COMPANY_CONTEXT_REQUIRED", message: "Seleccione una empresa." } } },
    });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo producto" }));

    expect(await screen.findByText("No se pudo cargar el perfil tributario de la empresa.")).toBeInTheDocument();
    expect(screen.queryByText("No se pudo cargar el detalle del producto.")).not.toBeInTheDocument();
  });

  it("conserva el borrador ante un fallo de red", async () => {
    const user = userEvent.setup();
    vi.mocked(createProductoIntegral).mockRejectedValue(new Error("network down"));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo producto" }));
    await user.type(await screen.findByLabelText(/Nombre/), "Producto sin conexión");
    await user.type(screen.getByLabelText(/PVP/), "12");
    await user.selectOptions(screen.getByLabelText(/Categoría principal/), "category-1");
    await user.selectOptions(screen.getByLabelText(/IVA/), "tax-iva");
    await user.type(await screen.findByLabelText(/Material/), "Fibra");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar el producto.");
    expect(screen.getByLabelText(/Nombre/)).toHaveValue("Producto sin conexión");
    expect(screen.getByLabelText(/Material/)).toHaveValue("Fibra");
  });
});