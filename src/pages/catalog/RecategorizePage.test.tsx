import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCatalogPermissions } from "@/features/categorias/useCatalogPermissions";
import { getCategoriasCanonicas, getProductosSinRecategorizar } from "@/features/categorias/api";
import RecategorizePage from "./RecategorizePage";

vi.mock("@/features/categorias/useCatalogPermissions", () => ({
  useCatalogPermissions: vi.fn(),
}));

vi.mock("@/features/categorias/api", () => ({
  getCategoriasCanonicas: vi.fn(),
  getProductosSinRecategorizar: vi.fn(),
  recategorizarProductos: vi.fn(),
}));

const grant = (codigo: string, puedeLeer: boolean, puedeActualizar: boolean) => ({
  codigo,
  nombre: codigo,
  puede_leer: puedeLeer,
  puede_crear: false,
  puede_actualizar: puedeActualizar,
  puede_eliminar: false,
});

describe("RecategorizePage permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCatalogPermissions).mockReturnValue({
      actor: "operator-1",
      context: {
        actor: "operator-1",
        permissionsActor: "operator-1",
        status: "listo",
        permissions: [grant("CATEGORIAS", true, false)],
      },
      permissions: { isPending: false, isError: false },
    } as never);
    vi.mocked(getProductosSinRecategorizar).mockResolvedValue([
      {
        producto_id: "product-1",
        nombre: "Producto pendiente",
        codigo_barras: null,
        categoria_id: "bucket-1",
        categoria_nombre: "Sin clasificar",
        padre_id: "parent-1",
        padre_nombre: "Tecnología",
      },
    ] as never);
    vi.mocked(getCategoriasCanonicas).mockResolvedValue([
      {
        id: "bucket-1",
        nombre: "Sin clasificar",
        es_padre: false,
        is_default: true,
        parent_id: "parent-1",
        activo: true,
      },
      {
        id: "leaf-1",
        nombre: "Laptop",
        es_padre: false,
        is_default: false,
        parent_id: "parent-1",
        activo: true,
      },
      {
        id: "parent-1",
        nombre: "Tecnología",
        es_padre: true,
        is_default: false,
        parent_id: null,
        activo: true,
      },
    ] as never);
  });

  it("permite consultar pendientes, pero oculta la mutación sin CATEGORIAS.actualizar", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RecategorizePage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Producto pendiente")).toBeInTheDocument();
    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Guardar/ })).not.toBeInTheDocument();
  });
});