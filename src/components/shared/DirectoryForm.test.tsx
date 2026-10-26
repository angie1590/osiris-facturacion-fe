import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import api from "@/lib/api";
import { DirectoryForm } from "./DirectoryForm";
import {
  compatibleOpenApi,
  directoryResponse,
  testPersona,
  emptyLinks,
} from "@/test/directory-fixtures";
import {
  buildDirectoryInput,
  supportsComposite,
  type DirectoryRecord,
  type DirectoryResource,
} from "@/features/personas/directory";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "current-user" } }),
}));
vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

function renderForm(resource: DirectoryResource, record?: DirectoryRecord) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onSaved = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <DirectoryForm
        resource={resource}
        record={record}
        onClose={vi.fn()}
        onSaved={onSaved}
        onExisting={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { client, onSaved };
}

async function completePersona(
  user: ReturnType<typeof userEvent.setup>,
  existing = false,
) {
  await user.type(
    screen.getByRole("textbox", { name: "Identificacion" }),
    "0102030405001",
  );
  await user.click(screen.getByRole("button", { name: "Buscar Persona" }));
  if (existing) {
    await screen.findByText("Ana Pineda");
    return;
  }
  await user.type(
    await screen.findByRole("textbox", { name: "Nombre" }),
    "Nueva",
  );
  await user.type(screen.getByRole("textbox", { name: "Apellido" }), "Persona");
  await user.click(screen.getByRole("button", { name: "Completar Persona" }));
}

async function fillParent(
  user: ReturnType<typeof userEvent.setup>,
  resource: DirectoryResource,
) {
  for (const combobox of screen.getAllByRole("combobox")) {
    if (combobox.tagName === "BUTTON") {
      await user.click(combobox);
      await user.click(
        await screen.findByRole("option", {
          name: /Opcion activa|Empresa autorizada/,
        }),
      );
    }
  }
  if (resource.startsWith("proveedores-"))
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tipo de contribuyente" }),
      resource === "proveedores-persona" ? "N" : "S",
    );
  if (resource === "proveedores-sociedad") {
    for (const [label, value] of [
      ["RUC Sociedad", "0190000000001"],
      ["Razon social", "Sociedad de prueba"],
      ["Direccion", "Cuenca"],
      ["Email", "sociedad@example.com"],
    ])
      await user.type(screen.getByRole("textbox", { name: label }), value);
  }
  if (resource === "empleados") {
    await user.type(
      screen.getByRole("textbox", { name: "Salario" }),
      "1200.10",
    );
    await user.type(screen.getByLabelText(/^Fecha de ingreso/), "2026-01-01");
  }
  if (resource === "empleados" || resource === "usuarios") {
    await user.type(
      screen.getByRole("textbox", { name: "Usuario" }),
      "usuario.nuevo",
    );
    await user.type(screen.getByLabelText(/^Contrasena/), "testing-pass-123");
  }
}

describe("formulario compuesto compartido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation(
      async (url) => ({ data: directoryResponse(String(url)) }) as never,
    );
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: "saved",
        persona_id: testPersona.id,
        persona: testPersona,
        activo: true,
      },
    });
    vi.mocked(api.put).mockResolvedValue({
      data: { id: "saved", activo: true },
    });
  });
  it.each([
    "clientes",
    "proveedores-persona",
    "empleados",
    "usuarios",
    "proveedores-sociedad",
  ] as const)(
    "conserva el padre y envia una sola operacion: %s",
    async (resource) => {
      const user = userEvent.setup();
      const { onSaved } = renderForm(resource);
      await waitFor(() =>
        expect(
          screen.queryByText(/Verificando contrato/),
        ).not.toBeInTheDocument(),
      );
      await fillParent(user, resource);
      await completePersona(user);
      expect(api.post).not.toHaveBeenCalled();
      await user.click(
        screen.getByRole("button", { name: "Cancelar Persona" }),
      );
      if (resource === "empleados")
        expect(screen.getByRole("textbox", { name: "Salario" })).toHaveValue(
          "1200.10",
        );
      if (resource === "usuarios" || resource === "empleados")
        expect(screen.getByRole("textbox", { name: "Usuario" })).toHaveValue(
          "usuario.nuevo",
        );
      if (resource === "proveedores-sociedad")
        expect(
          screen.getByRole("textbox", { name: "Razon social" }),
        ).toHaveValue("Sociedad de prueba");
      await completePersona(user);
      await user.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith(
        `/${resource}`,
        expect.objectContaining({
          [resource === "proveedores-sociedad"
            ? "persona_contacto_nueva"
            : "persona_nueva"]: expect.objectContaining({
            nombre: "Nueva",
            apellido: "Persona",
          }),
        }),
      );
      const payload = vi.mocked(api.post).mock.calls[0][1];
      expect(payload).not.toHaveProperty("usuario_auditoria");
      if (resource === "empleados")
        expect(payload).toMatchObject({
          salario: "1200.10",
          usuario: {
            username: "usuario.nuevo",
            password: "testing-pass-123",
            rol_id: "catalog-1",
          },
        });
      if (resource === "usuarios")
        expect(payload).not.toHaveProperty("empresa_id");
    },
  );
  it("mantiene campos y feedback 422 del servidor", async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: {
        status: 422,
        data: {
          detail: [
            {
              loc: ["body", "persona_nueva", "nombre"],
              msg: "Nombre no admitido",
            },
          ],
        },
      },
    });
    const user = userEvent.setup();
    renderForm("usuarios");
    await fillParent(user, "usuarios");
    await completePersona(user);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nombre no admitido",
    );
    expect(screen.getByRole("textbox", { name: "Usuario" })).toHaveValue(
      "usuario.nuevo",
    );
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
  it("no habilita el alta en un backend no compatible", async () => {
    const original = vi.mocked(api.get).getMockImplementation()!;
    vi.mocked(api.get).mockImplementation(async (...args) =>
      args[0] === "/personas/contrato"
        ? ({ data: { paths: {} } } as never)
        : original(...args),
    );
    renderForm("usuarios");
    expect(await screen.findByText(/Alta deshabilitada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });
  it("cambia contacto con un solo PUT sin modificar contacto anterior", async () => {
    const user = userEvent.setup();
    const { onSaved } = renderForm("proveedores-sociedad", {
      id: "society-1",
      ruc: "0190000000001",
      razon_social: "Sociedad",
      direccion: "Cuenca",
      email: "sociedad@example.com",
      tipo_contribuyente_id: "S",
      persona_contacto_id: "old-contact",
      activo: true,
    });
    await user.click(screen.getByRole("button", { name: "Cambiar contacto" }));
    await completePersona(user);
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.put).toHaveBeenCalledExactlyOnceWith(
      "/proveedores-sociedad/society-1",
      expect.objectContaining({
        razon_social: "Sociedad",
        persona_contacto_nueva: expect.objectContaining({ nombre: "Nueva" }),
      }),
    );
    expect(api.post).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
  it("previene un rol duplicado y ofrece ver existente", async () => {
    const original = vi.mocked(api.get).getMockImplementation()!;
    vi.mocked(api.get).mockImplementation(async (...args) => {
      if (args[0] === "/personas")
        return {
          data: {
            items: [testPersona],
            meta: { total: 1, limit: 2, offset: 0 },
          },
        } as never;
      if (String(args[0]).endsWith("/vinculos"))
        return {
          data: {
            ...emptyLinks,
            usuario: { id: "existing-user", activo: true },
          },
        } as never;
      return original(...args);
    });
    const user = userEvent.setup();
    renderForm("usuarios");
    await completePersona(user, true);
    expect(
      await screen.findByText(/ya tiene Usuario activo/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Ver existente" }),
    ).toBeInTheDocument();
  });
  it("serializa salario exacto y no modifica identidad ni username al editar", () => {
    const values = {
      salario: "999999.99",
      empresa_id: "company-1",
      fecha_ingreso: "2026-01-01",
      rol_id: "rol-1",
      username: "immutable",
      password: "not-sent",
    };
    expect(
      buildDirectoryInput("empleados", values, { kind: "none" }, true),
    ).toMatchObject({ salario: "999999.99" });
    expect(
      buildDirectoryInput(
        "usuarios",
        values,
        { kind: "existing", persona: testPersona },
        true,
      ),
    ).toEqual({ rol_id: "rol-1" });
    expect(supportsComposite(compatibleOpenApi, "empleados")).toBe(true);
  });
});
