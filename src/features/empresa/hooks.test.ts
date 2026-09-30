import { describe, expect, it } from "vitest";
import {
  buildEmpresaConfigurationStatus,
  certificatePreviewToEmpresaForm,
  type EmpresaCanonica,
  type SriRucCertificatePreview,
} from "@/features/empresa/hooks";

function buildEmpresa(
  overrides: Partial<EmpresaCanonica> = {},
): EmpresaCanonica {
  return {
    id: "empresa-1",
    ruc: "1104680138001",
    razon_social: "Empresa Demo",
    nombre_comercial: "Demo",
    tipo_contribuyente_juridico: "PERSONA_NATURAL",
    regimen: "GENERAL",
    obligado_contabilidad: false,
    contribuyente_especial: false,
    contribuyente_especial_resolucion: null,
    gran_contribuyente: false,
    gran_contribuyente_resolucion: null,
    agente_retencion: false,
    agente_retencion_resolucion: null,
    direccion_matriz: "Av. Principal",
    email: null,
    telefono: null,
    logo: null,
    modo_emision: "ELECTRONICO",
    tipo_contribuyente_id: "01",
    ...overrides,
  };
}

describe("buildEmpresaConfigurationStatus", () => {
  it("marca incompleto cuando no existe empresa", () => {
    const result = buildEmpresaConfigurationStatus(null);
    expect(result.fiscalComplete).toBe(false);
    expect(result.missingFiscalFields).toContain("RUC");
    expect(result.missingFiscalFields).toContain("Tipo de contribuyente");
  });

  it("no exige email para configuracion fiscal completa", () => {
    const result = buildEmpresaConfigurationStatus(buildEmpresa({ email: null }));
    expect(result.fiscalComplete).toBe(true);
    expect(result.missingFiscalFields).toHaveLength(0);
  });

  it("exige resolucion cuando contribuyente especial esta activo", () => {
    const result = buildEmpresaConfigurationStatus(
      buildEmpresa({
        contribuyente_especial: true,
        contribuyente_especial_resolucion: null,
      }),
    );

    expect(result.fiscalComplete).toBe(false);
    expect(result.missingFiscalFields).toContain(
      "Resolución de contribuyente especial",
    );
  });

  it("exige resolucion cuando gran contribuyente o agente retencion estan activos", () => {
    const result = buildEmpresaConfigurationStatus(
      buildEmpresa({
        gran_contribuyente: true,
        gran_contribuyente_resolucion: "",
        agente_retencion: true,
        agente_retencion_resolucion: null,
      }),
    );

    expect(result.fiscalComplete).toBe(false);
    expect(result.missingFiscalFields).toContain(
      "Resolución de gran contribuyente",
    );
    expect(result.missingFiscalFields).toContain(
      "Resolución de agente de retención",
    );
  });
});

describe("certificatePreviewToEmpresaForm", () => {
  it("mapea solo campos persistibles de empresa", () => {
    const preview: SriRucCertificatePreview = {
      ruc: "0103523908001",
      razon_social: "PINEDA ALVAREZ DANIEL FERNANDO",
      tipo_contribuyente_juridico: "PERSONA_NATURAL",
      regimen: "GENERAL",
      obligado_contabilidad: false,
      agente_retencion: false,
      contribuyente_especial: false,
      direccion_matriz: "CALLE: DE LAS HIEDRAS NÚMERO: S/N",
      additional: {
        estado: "ACTIVO",
        artesano: "No registra",
        provincia: "AZUAY",
        canton: "CUENCA",
        parroquia: "SAN SEBASTIAN",
        jurisdiccion: "ZONA 6 / AZUAY / CUENCA",
        actividades_economicas: ["G46510101 - VENTA DE COMPUTADORAS"],
        obligaciones_tributarias: ["2011 - DECLARACION DE IVA"],
        codigo_verificacion: "RCR1716479633455575",
      },
      warnings: [],
    };

    expect(certificatePreviewToEmpresaForm(preview)).toEqual({
      ruc: "0103523908001",
      razon_social: "PINEDA ALVAREZ DANIEL FERNANDO",
      tipo_contribuyente_juridico: "PERSONA_NATURAL",
      regimen: "GENERAL",
      obligado_contabilidad: false,
      agente_retencion: false,
      contribuyente_especial: false,
      direccion_matriz: "CALLE: DE LAS HIEDRAS NÚMERO: S/N",
    });
  });
});
