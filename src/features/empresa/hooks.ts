import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export type TipoContribuyenteJuridico = "PERSONA_NATURAL" | "SOCIEDAD";
export type RegimenTributario =
  | "GENERAL"
  | "RIMPE_NEGOCIO_POPULAR"
  | "RIMPE_EMPRENDEDOR";

export interface EmpresaCanonica {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  tipo_contribuyente_juridico: TipoContribuyenteJuridico | null;
  regimen: RegimenTributario;
  obligado_contabilidad: boolean;
  contribuyente_especial: boolean;
  contribuyente_especial_resolucion: string | null;
  gran_contribuyente: boolean;
  gran_contribuyente_resolucion: string | null;
  agente_retencion: boolean;
  agente_retencion_resolucion: string | null;
  direccion_matriz: string;
  email: string | null;
  telefono: string | null;
  logo: string | null;
  modo_emision: string;
  tipo_contribuyente_id: string;
}

export interface EmpresaConfigurationStatus {
  fiscalComplete: boolean;
  missingFiscalFields: string[];
}

export interface SriRucCertificatePreview {
  ruc: string;
  razon_social: string;
  tipo_contribuyente_juridico: TipoContribuyenteJuridico;
  regimen: RegimenTributario;
  obligado_contabilidad: boolean;
  agente_retencion: boolean;
  contribuyente_especial: boolean;
  direccion_matriz: string;
  additional: {
    estado: string | null;
    artesano: string | null;
    provincia: string | null;
    canton: string | null;
    parroquia: string | null;
    jurisdiccion: string | null;
    actividades_economicas: string[];
    obligaciones_tributarias: string[];
    codigo_verificacion: string | null;
  };
  warnings: string[];
}

export function certificatePreviewToEmpresaForm(
  preview: SriRucCertificatePreview,
) {
  return {
    ruc: preview.ruc,
    razon_social: preview.razon_social,
    tipo_contribuyente_juridico: preview.tipo_contribuyente_juridico,
    regimen: preview.regimen,
    obligado_contabilidad: preview.obligado_contabilidad,
    agente_retencion: preview.agente_retencion,
    contribuyente_especial: preview.contribuyente_especial,
    direccion_matriz: preview.direccion_matriz,
  };
}

export async function previewSriRucCertificate(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<SriRucCertificatePreview>(
    "/empresas/importar-certificado-ruc",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
}

export function useSriRucCertificatePreview() {
  return useMutation({ mutationFn: previewSriRucCertificate });
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function buildEmpresaConfigurationStatus(
  empresa: EmpresaCanonica | null | undefined,
): EmpresaConfigurationStatus {
  if (!empresa) {
    return {
      fiscalComplete: false,
      missingFiscalFields: [
        "RUC",
        "Razón social",
        "Tipo de contribuyente",
        "Régimen tributario",
        "Dirección matriz",
      ],
    };
  }

  const missing: string[] = [];
  if (!hasValue(empresa.ruc)) missing.push("RUC");
  if (!hasValue(empresa.razon_social)) missing.push("Razón social");
  if (!hasValue(empresa.tipo_contribuyente_juridico)) {
    missing.push("Tipo de contribuyente");
  }
  if (!hasValue(empresa.regimen)) missing.push("Régimen tributario");
  if (!hasValue(empresa.direccion_matriz)) missing.push("Dirección matriz");

  if (
    empresa.contribuyente_especial &&
    !hasValue(empresa.contribuyente_especial_resolucion)
  ) {
    missing.push("Resolución de contribuyente especial");
  }

  if (
    empresa.gran_contribuyente &&
    !hasValue(empresa.gran_contribuyente_resolucion)
  ) {
    missing.push("Resolución de gran contribuyente");
  }

  if (
    empresa.agente_retencion &&
    !hasValue(empresa.agente_retencion_resolucion)
  ) {
    missing.push("Resolución de agente de retención");
  }

  return {
    fiscalComplete: missing.length === 0,
    missingFiscalFields: missing,
  };
}

export function useEmpresaPrincipal() {
  return useQuery({
    queryKey: ["empresa-principal"],
    queryFn: async () => {
      const response = await api.get<{ items: EmpresaCanonica[] }>(
        "/empresas",
        {
          params: { limit: 1, offset: 0, only_active: true },
        },
      );
      return response.data.items[0] ?? null;
    },
    staleTime: 30_000,
    retry: 1,
  });
}
