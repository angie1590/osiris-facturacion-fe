import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/lib/api";
import {
  contactReference,
  createCliente,
  createProveedorSociedad,
  getPersonas,
  personaReference,
  setPersonaActive,
  type PersonaCreateInput,
} from "./api";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
const draft: PersonaCreateInput = {
  tipo_identificacion: "CEDULA",
  identificacion: "0102030405",
  nombre: "Ana",
  apellido: "Perez",
};

describe("contratos compuestos del directorio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { id: "saved" } });
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], meta: { total: 0 } },
    });
  });
  it("envia un cliente y su borrador en una sola peticion", async () => {
    await createCliente(
      personaReference({ kind: "new", borradorPersona: draft }),
      "tipo-1",
    );
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/clientes", {
      persona_nueva: draft,
      tipo_cliente_id: "tipo-1",
    });
  });
  it("envia el contacto nuevo con la sociedad sin crear Persona aparte", async () => {
    await createProveedorSociedad({
      ...contactReference({ kind: "new", borradorPersona: draft }),
      ruc: "0190000000001",
      razon_social: "Sociedad",
      direccion: "Cuenca",
      email: "sociedad@example.com",
      tipo_contribuyente_id: "02",
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      "/proveedores-sociedad",
      expect.objectContaining({ persona_contacto_nueva: draft }),
    );
  });
  it("consulta estado explicito, busqueda y orden del servidor", async () => {
    await getPersonas(20, 20, false, {
      estado: "inactivo",
      q: "Ana",
      sort_by: "email",
      sort_direction: "desc",
    });
    expect(api.get).toHaveBeenCalledWith("/personas", {
      params: {
        offset: 20,
        limit: 20,
        only_active: false,
        estado: "inactivo",
        q: "Ana",
        sort_by: "email",
        sort_direction: "desc",
      },
    });
  });
  it("reactiva con la accion explicita", async () => {
    await setPersonaActive("persona-1", true);
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      "/personas/persona-1/reactivar",
    );
    expect(api.put).not.toHaveBeenCalled();
  });
});
