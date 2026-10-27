import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EffectivePermission } from "@/features/personas/directory";
import { useCatalogPermissions } from "@/features/categorias/useCatalogPermissions";
import { CatalogPermissionRoute } from "./CatalogPermissionRoute";
import RemapPage from "@/pages/catalog/RemapPage";
import { usePendingRemap, useResolveRemap } from "@/features/catalog/remapHooks";

vi.mock("@/features/catalog/remapHooks", () => ({
  usePendingRemap: vi.fn(),
  useResolveRemap: vi.fn(),
}));

vi.mock("@/features/catalog/catalogHooks", () => ({
  useCatalogValues: () => ({ data: [] }),
}));

vi.mock("@/features/categorias/useCatalogPermissions", () => ({
  useCatalogPermissions: vi.fn(),
}));

const mockUseCatalogPermissions = vi.mocked(useCatalogPermissions);

function permission(
  codigo: string,
  flags: Partial<Pick<EffectivePermission, "puede_leer" | "puede_actualizar">>,
): EffectivePermission {
  return {
    codigo,
    nombre: codigo,
    puede_leer: flags.puede_leer ?? false,
    puede_crear: false,
    puede_actualizar: flags.puede_actualizar ?? false,
    puede_eliminar: false,
  };
}

function renderGuardedRoute(
  operations: readonly ("read_categories" | "update_category" | "read_attributes")[],
) {
  return render(
    <MemoryRouter initialEntries={["/guarded"]}>
      <Routes>
        <Route element={<CatalogPermissionRoute operations={operations} />}>
          <Route path="/guarded" element={<p>Contenido protegido</p>} />
        </Route>
        <Route path="/prohibido" element={<p>Sin acceso efectivo</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CatalogPermissionRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite a un usuario no admin con permiso efectivo de lectura", async () => {
    const permissions = [permission("ATRIBUTOS", { puede_leer: true })];
    mockUseCatalogPermissions.mockReturnValue({
      actor: "operator-1",
      context: {
        actor: "operator-1",
        permissionsActor: "operator-1",
        status: "listo",
        permissions,
      },
      permissions: { isPending: false, isError: false },
    } as unknown as ReturnType<typeof useCatalogPermissions>);

    renderGuardedRoute(["read_attributes"]);

    expect(await screen.findByText("Contenido protegido")).toBeInTheDocument();
  });

  it("deniega recategorización si falta actualización efectiva", async () => {
    const permissions = [permission("CATEGORIAS", { puede_leer: true })];
    mockUseCatalogPermissions.mockReturnValue({
      actor: "operator-1",
      context: {
        actor: "operator-1",
        permissionsActor: "operator-1",
        status: "listo",
        permissions,
      },
      permissions: { isPending: false, isError: false },
    } as unknown as ReturnType<typeof useCatalogPermissions>);

    renderGuardedRoute(["read_categories", "update_category"]);

    expect(await screen.findByText("Sin acceso efectivo")).toBeInTheDocument();
  });

  it("permite leer remapeos pero oculta resolver sin ATRIBUTOS.actualizar", () => {
    const permissions = [permission("ATRIBUTOS", { puede_leer: true })];
    mockUseCatalogPermissions.mockReturnValue({
      actor: "operator-1",
      context: {
        actor: "operator-1",
        permissionsActor: "operator-1",
        status: "listo",
        permissions,
      },
      permissions: { isPending: false, isError: false },
    } as unknown as ReturnType<typeof useCatalogPermissions>);
    vi.mocked(usePendingRemap).mockReturnValue({
      data: {
        total: 1,
        groups: [{
          attribute_id: "attribute-1",
          attribute_name: "RAM",
          target_type: "integer",
          is_required: false,
          catalog_id: null,
          allowed_values: null,
          items: [{
            id: "remap-1",
            product_id: "product-1",
            product_name: "Equipo E2E",
            old_value: "n/a",
          }],
        }],
      },
      isLoading: false,
    } as never);
    vi.mocked(useResolveRemap).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);

    render(
      <MemoryRouter>
        <RemapPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Equipo E2E")).toBeInTheDocument();
    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Guardar/ })).not.toBeInTheDocument();
  });
});
