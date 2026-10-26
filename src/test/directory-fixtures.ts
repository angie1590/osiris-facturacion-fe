import type { Persona, PersonaVinculos } from "@/features/personas/api";
import {
  directoryConfig,
  type DirectoryOpenApi,
} from "@/features/personas/directory";

export const testPersona: Persona = {
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
export const emptyLinks: PersonaVinculos = {
  persona_id: testPersona.id,
  cliente: null,
  proveedor_persona: null,
  empleado: null,
  usuario: null,
  proveedores_sociedad: [],
  dependencias_activas: [],
};
export const allPermissions = Object.values(directoryConfig).map((config) => ({
  codigo: config.permission,
  nombre: config.title,
  puede_leer: true,
  puede_crear: true,
  puede_actualizar: true,
  puede_eliminar: true,
}));
export const compatibleOpenApi: DirectoryOpenApi = {
  paths: Object.fromEntries(
    Object.keys(directoryConfig).map((resource) => [
      `/api/v1/${resource}`,
      {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  properties: {
                    [resource === "proveedores-sociedad"
                      ? "persona_contacto_nueva"
                      : "persona_nueva"]: {},
                  },
                },
              },
            },
          },
        },
      },
    ]),
  ),
};

export function directoryResponse(url: string) {
  if (url.endsWith("/permisos")) return allPermissions;
  if (url === "/personas/contrato") return compatibleOpenApi;
  if (url.endsWith("/vinculos")) return emptyLinks;
  if (url === "/tipos-contribuyente")
    return [
      {
        codigo: "N",
        nombre: "Natural",
        descripcion: null,
        activo: true,
        aplica_persona_natural: true,
        aplica_sociedad: false,
      },
      {
        codigo: "S",
        nombre: "Sociedad",
        descripcion: null,
        activo: true,
        aplica_persona_natural: false,
        aplica_sociedad: true,
      },
      {
        codigo: "B",
        nombre: "Ambos",
        descripcion: null,
        activo: true,
        aplica_persona_natural: true,
        aplica_sociedad: true,
      },
    ];
  if (url.startsWith("/personas/")) return testPersona;
  if (["/roles", "/empresas", "/tipos-cliente"].includes(url))
    return {
      items: [
        {
          id: "catalog-1",
          nombre: "Opcion activa",
          razon_social: "Empresa autorizada",
          activo: true,
        },
      ],
      meta: { total: 1, limit: 20, offset: 0 },
    };
  if (url.includes("/catalog-1"))
    return { id: "catalog-1", nombre: "Opcion activa", activo: true };
  return { items: [], meta: { total: 0, limit: 20, offset: 0 } };
}
