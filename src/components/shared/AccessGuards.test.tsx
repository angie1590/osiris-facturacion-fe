import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleGuard } from "./RoleGuard";
import type { CurrentUser, UserRole } from "@/types/api";
import type { useAuth } from "@/contexts/AuthContext";

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({ useAuth: mockUseAuth }));

function buildUser(role: UserRole, overrides: Partial<CurrentUser> = {}) {
  return {
    id: 1,
    username: "TEST",
    full_name: "Usuario Test",
    role,
    is_active: true,
    require_password_change: false,
    created_at: "2026-09-30T00:00:00Z",
    ...overrides,
  } satisfies CurrentUser;
}

function authValue(user: CurrentUser | null, isLoading = false) {
  return {
    user,
    isLoading,
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    reloadUser: vi.fn(),
  } satisfies ReturnType<typeof useAuth>;
}

function renderProtectedRoute() {
  render(
    <MemoryRouter initialEntries={["/privado"]}>
      <Routes>
        <Route path="/login" element={<p>Login</p>} />
        <Route path="/change-password" element={<p>Cambiar clave</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/privado" element={<p>Contenido privado</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderRoleGuard(role: UserRole | null, allowedRoles: UserRole[]) {
  mockUseAuth.mockReturnValue(
    authValue(role ? buildUser(role) : null),
  );
  render(
    <MemoryRouter initialEntries={["/administracion"]}>
      <Routes>
        <Route path="/login" element={<p>Login</p>} />
        <Route path="/403" element={<p>Acceso denegado</p>} />
        <Route element={<RoleGuard roles={allowedRoles} />}>
          <Route path="/administracion" element={<p>Administración</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("access guards", () => {
  beforeEach(() => mockUseAuth.mockReset());

  it("muestra carga mientras se restaura la sesión", () => {
    mockUseAuth.mockReturnValue(authValue(null, true));
    renderProtectedRoute();
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("redirige a login cuando no existe sesión", () => {
    mockUseAuth.mockReturnValue(authValue(null));
    renderProtectedRoute();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("obliga a cambiar la contraseña antes de entrar", () => {
    mockUseAuth.mockReturnValue(
      authValue(buildUser("operator", { require_password_change: true })),
    );
    renderProtectedRoute();
    expect(screen.getByText("Cambiar clave")).toBeInTheDocument();
  });

  it("permite el contenido a una sesión válida", () => {
    mockUseAuth.mockReturnValue(authValue(buildUser("operator")));
    renderProtectedRoute();
    expect(screen.getByText("Contenido privado")).toBeInTheDocument();
  });

  it("redirige a 403 cuando el rol no está autorizado", () => {
    renderRoleGuard("operator", ["admin", "supervisor"]);
    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
  });

  it("permite la ruta cuando el rol está autorizado", () => {
    renderRoleGuard("supervisor", ["admin", "supervisor"]);
    expect(screen.getByText("Administración")).toBeInTheDocument();
  });
});