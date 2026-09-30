import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  FileUp,
  FileText,
  Landmark,
  KeyRound,
  Mail,
  MapPin,
  ReceiptText,
  Search,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { ConfigurationNotice } from "@/components/shared/ConfigurationNotice";
import { ConfigurationPanel } from "@/components/shared/ConfigurationPanel";
import { TablePagination } from "@/components/shared/TablePagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  buildEmpresaConfigurationStatus,
  certificatePreviewToEmpresaForm,
  deleteEmpresaSignature,
  uploadEmpresaSignature,
  useSriRucCertificatePreview,
  type RegimenTributario,
  type SriRucCertificatePreview,
  type TipoContribuyenteJuridico,
} from "@/features/empresa/hooks";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const RUC_CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024;

const schema = z
  .object({
    ruc: z
      .string()
      .trim()
      .transform((value) => value.replace(/\D/g, ""))
      .refine((value) => value.length === 13, "El RUC debe contener 13 dígitos."),
    razon_social: z.string().trim().min(1, "Debe ingresar la razón social."),
    nombre_comercial: z.string().trim().optional(),
    tipo_contribuyente_juridico: z
      .string()
      .refine(
        (value): value is TipoContribuyenteJuridico =>
          value === "PERSONA_NATURAL" || value === "SOCIEDAD",
        "Debe seleccionar el tipo de contribuyente.",
      ),
    regimen: z.enum(
      ["GENERAL", "RIMPE_NEGOCIO_POPULAR", "RIMPE_EMPRENDEDOR"],
      { error: "Debe seleccionar el régimen tributario." },
    ),
    obligado_contabilidad: z.boolean(),
    contribuyente_especial: z.boolean(),
    contribuyente_especial_resolucion: z.string().trim().optional(),
    gran_contribuyente: z.boolean(),
    gran_contribuyente_resolucion: z.string().trim().optional(),
    agente_retencion: z.boolean(),
    agente_retencion_resolucion: z.string().trim().optional(),
    artesano_calificado: z.boolean(),
    impuesto_catalogo_ids: z.array(z.string()),
    modo_emision: z.enum(["ELECTRONICO", "NOTA_VENTA_FISICA"]),
    direccion_matriz: z.string().trim().min(1, "Debe ingresar la dirección matriz."),
    email: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
        "El correo electrónico no es válido.",
      ),
    telefono: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ?? "").replace(/\D/g, "")),
  })
  .superRefine((value, ctx) => {
    if (
      value.tipo_contribuyente_juridico === "SOCIEDAD" &&
      value.regimen === "RIMPE_NEGOCIO_POPULAR"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["regimen"],
        message: "La combinación Sociedad + RIMPE Negocio Popular no está permitida.",
      });
    }

    if (value.contribuyente_especial && !value.contribuyente_especial_resolucion) {
      ctx.addIssue({
        code: "custom",
        path: ["contribuyente_especial_resolucion"],
        message: "El número de resolución es obligatorio para un contribuyente especial.",
      });
    }

    if (value.gran_contribuyente && !value.gran_contribuyente_resolucion) {
      ctx.addIssue({
        code: "custom",
        path: ["gran_contribuyente_resolucion"],
        message: "El número de resolución es obligatorio para un gran contribuyente.",
      });
    }

    if (value.agente_retencion && !value.agente_retencion_resolucion) {
      ctx.addIssue({
        code: "custom",
        path: ["agente_retencion_resolucion"],
        message: "El número de resolución es obligatorio para un agente de retención.",
      });
    }

    const puedeEmitirNotaVenta =
      value.regimen === "RIMPE_NEGOCIO_POPULAR" || value.artesano_calificado;
    if (puedeEmitirNotaVenta && value.modo_emision !== "NOTA_VENTA_FISICA") {
      ctx.addIssue({
        code: "custom",
        path: ["modo_emision"],
        message: "RIMPE Negocio Popular y artesanos calificados deben usar nota de venta física.",
      });
    }
    if (!puedeEmitirNotaVenta && value.modo_emision === "NOTA_VENTA_FISICA") {
      ctx.addIssue({
        code: "custom",
        path: ["modo_emision"],
        message: "La nota de venta física solo está permitida para RIMPE Negocio Popular o artesanos calificados.",
      });
    }
  });

type Empresa = {
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
  artesano_calificado: boolean;
  impuesto_catalogo_ids: string[];
  direccion_matriz: string;
  email: string | null;
  telefono: string | null;
  logo: string | null;
  modo_emision: string;
  tipo_contribuyente_id: string;
  firma_electronica_configurada: boolean;
  firma_nombre_archivo: string | null;
  firma_caduca_en: string | null;
};

type ImpuestoCatalogo = {
  id: string;
  tipo_impuesto: string;
  codigo_sri: string;
  descripcion: string;
  porcentaje_iva: string | null;
  tarifa_ad_valorem?: string | null;
  tarifa_especifica?: string | null;
  clasificacion_iva?: string | null;
  activo: boolean;
};

const TAX_TYPES = [
  { value: "IVA", label: "IVA", description: "Tarifas y clasificación de IVA" },
  { value: "ICE", label: "ICE", description: "Impuesto a consumos especiales" },
] as const;

const ICE_PAGE_SIZE = 6;

type Sucursal = {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  empresa_id: string;
  es_matriz: boolean;
};

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

type ApiError = {
  response?: { data?: { detail?: string } };
};

type TipoContribuyenteForm = "" | TipoContribuyenteJuridico;

function inferLegacyTipoContribuyenteId(
  tipoJuridico: TipoContribuyenteForm,
): string {
  return tipoJuridico === "SOCIEDAD" ? "02" : "01";
}

function inferTipoJuridico(
  tipoJuridico: TipoContribuyenteJuridico | null,
  tipoContribuyenteId: string,
): TipoContribuyenteForm {
  if (tipoJuridico) return tipoJuridico;
  if (tipoContribuyenteId === "01") return "PERSONA_NATURAL";
  if (tipoContribuyenteId === "02") return "SOCIEDAD";
  return "";
}

const REGIMEN_OPTIONS: Record<TipoContribuyenteJuridico, Array<{ value: RegimenTributario; label: string }>> = {
  PERSONA_NATURAL: [
    { value: "GENERAL", label: "General" },
    { value: "RIMPE_NEGOCIO_POPULAR", label: "RIMPE - Negocio Popular" },
    { value: "RIMPE_EMPRENDEDOR", label: "RIMPE - Emprendedor" },
  ],
  SOCIEDAD: [
    { value: "GENERAL", label: "General" },
    { value: "RIMPE_EMPRENDEDOR", label: "RIMPE - Emprendedor" },
  ],
};

const REGIMEN_OPTIONS_ALL: Array<{ value: RegimenTributario; label: string }> = [
  { value: "GENERAL", label: "General" },
  { value: "RIMPE_NEGOCIO_POPULAR", label: "RIMPE - Negocio Popular" },
  { value: "RIMPE_EMPRENDEDOR", label: "RIMPE - Emprendedor" },
];

export default function EmpresaCanonicaPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [certificatePreview, setCertificatePreview] =
    useState<SriRucCertificatePreview | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePassword, setSignaturePassword] = useState("");
  const [signaturePasswordConfirmation, setSignaturePasswordConfirmation] = useState("");
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [taxType, setTaxType] = useState<string>("IVA");
  const [taxSearch, setTaxSearch] = useState("");
  const [icePage, setIcePage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const certificateMutation = useSriRucCertificatePreview();
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const empresa = useQuery({
    queryKey: ["empresa-canonica"],
    queryFn: async () => {
      const response = await api.get<{ items: Empresa[] }>("/empresas", {
        params: { limit: 1, offset: 0, only_active: true },
      });
      return response.data.items[0] ?? null;
    },
  });

  const sucursales = useQuery({
    queryKey: ["sucursales-canonicas"],
    queryFn: async () => {
      const response = await api.get<{ items: Sucursal[] }>("/sucursales", {
        params: { limit: 1000, offset: 0, only_active: true },
      });
      return response.data.items;
    },
  });

  const impuestos = useQuery({
    queryKey: ["impuestos-canonicos"],
    queryFn: async () =>
      (await api.get<ImpuestoCatalogo[]>("/impuestos/activos-vigentes")).data,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ruc: "",
      razon_social: "",
      nombre_comercial: "",
      tipo_contribuyente_juridico: "",
      regimen: "GENERAL",
      obligado_contabilidad: false,
      contribuyente_especial: false,
      contribuyente_especial_resolucion: "",
      gran_contribuyente: false,
      gran_contribuyente_resolucion: "",
      agente_retencion: false,
      agente_retencion_resolucion: "",
      artesano_calificado: false,
      impuesto_catalogo_ids: [],
      modo_emision: "ELECTRONICO",
      direccion_matriz: "",
      email: "",
      telefono: "",
    },
  });

  useEffect(() => {
    if (!empresa.data) return;
    reset({
      ruc: empresa.data.ruc,
      razon_social: empresa.data.razon_social,
      nombre_comercial: empresa.data.nombre_comercial ?? "",
      tipo_contribuyente_juridico: inferTipoJuridico(
        empresa.data.tipo_contribuyente_juridico,
        empresa.data.tipo_contribuyente_id,
      ),
      regimen: empresa.data.regimen,
      obligado_contabilidad: empresa.data.obligado_contabilidad,
      contribuyente_especial: empresa.data.contribuyente_especial,
      contribuyente_especial_resolucion:
        empresa.data.contribuyente_especial_resolucion ?? "",
      gran_contribuyente: empresa.data.gran_contribuyente,
      gran_contribuyente_resolucion: empresa.data.gran_contribuyente_resolucion ?? "",
      agente_retencion: empresa.data.agente_retencion,
      agente_retencion_resolucion: empresa.data.agente_retencion_resolucion ?? "",
      artesano_calificado: empresa.data.artesano_calificado,
      impuesto_catalogo_ids: empresa.data.impuesto_catalogo_ids ?? [],
      modo_emision:
        empresa.data.modo_emision === "NOTA_VENTA_FISICA"
          ? "NOTA_VENTA_FISICA"
          : "ELECTRONICO",
      direccion_matriz: empresa.data.direccion_matriz,
      email: empresa.data.email ?? "",
      telefono: empresa.data.telefono ?? "",
    });
    setLogoPreview(empresa.data.logo ?? null);
  }, [empresa.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const tipoContribuyenteLegacy = inferLegacyTipoContribuyenteId(
        values.tipo_contribuyente_juridico,
      );
      const payload = {
        ruc: values.ruc,
        razon_social: values.razon_social,
        nombre_comercial: values.nombre_comercial || undefined,
        tipo_contribuyente_juridico: values.tipo_contribuyente_juridico,
        regimen: values.regimen,
        obligado_contabilidad: values.obligado_contabilidad,
        contribuyente_especial: values.contribuyente_especial,
        contribuyente_especial_resolucion: values.contribuyente_especial
          ? values.contribuyente_especial_resolucion || undefined
          : undefined,
        gran_contribuyente: values.gran_contribuyente,
        gran_contribuyente_resolucion: values.gran_contribuyente
          ? values.gran_contribuyente_resolucion || undefined
          : undefined,
        agente_retencion: values.agente_retencion,
        agente_retencion_resolucion: values.agente_retencion
          ? values.agente_retencion_resolucion || undefined
          : undefined,
        artesano_calificado: values.artesano_calificado,
        impuesto_catalogo_ids: values.impuesto_catalogo_ids,
        modo_emision: values.modo_emision,
        direccion_matriz: values.direccion_matriz,
        email: values.email || undefined,
        telefono: values.telefono || undefined,
        logo: logoPreview,
        tipo_contribuyente_id: tipoContribuyenteLegacy,
        usuario_auditoria: "frontend",
      };

      if (empresa.data?.id) {
        const response = await api.put(`/empresas/${empresa.data.id}`, payload);
        return response.data as Empresa;
      }

      const response = await api.post("/empresas", payload);
      return response.data as Empresa;
    },
    onSuccess: (savedEmpresa) => {
      queryClient.setQueryData(["empresa-canonica"], savedEmpresa);
      queryClient.invalidateQueries({ queryKey: ["empresa-canonica"] });
      setSaved(true);
    },
  });

  const tipoJuridico = watch("tipo_contribuyente_juridico");
  const regimen = watch("regimen");
  const modoEmision = watch("modo_emision");
  const artesanoCalificado = watch("artesano_calificado");
  const selectedTaxIds = watch("impuesto_catalogo_ids");
  const puedeEmitirNotaVenta = regimen === "RIMPE_NEGOCIO_POPULAR" || artesanoCalificado;
  const regimenOptions = useMemo(
    () => {
      if (tipoJuridico === "PERSONA_NATURAL" || tipoJuridico === "SOCIEDAD") {
        return REGIMEN_OPTIONS[tipoJuridico];
      }
      return REGIMEN_OPTIONS_ALL;
    },
    [tipoJuridico],
  );

  useEffect(() => {
    const currentRegimen = watch("regimen");
    if (regimenOptions.some((option) => option.value === currentRegimen)) return;
    setValue("regimen", regimenOptions[0].value, { shouldValidate: true });
  }, [regimenOptions, setValue, watch]);

  useEffect(() => {
    if (puedeEmitirNotaVenta && modoEmision !== "NOTA_VENTA_FISICA") {
      setValue("modo_emision", "NOTA_VENTA_FISICA", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (!puedeEmitirNotaVenta && modoEmision === "NOTA_VENTA_FISICA") {
      setValue("modo_emision", "ELECTRONICO", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [modoEmision, puedeEmitirNotaVenta, setValue]);

  const contribuyenteEspecial = watch("contribuyente_especial");
  const granContribuyente = watch("gran_contribuyente");
  const agenteRetencion = watch("agente_retencion");
  const configurationStatus = buildEmpresaConfigurationStatus(empresa.data);

  const matriz = useMemo(() => {
    if (!empresa.data || !sucursales.data) return null;
    return (
      sucursales.data.find(
        (item) => item.empresa_id === empresa.data?.id && item.es_matriz,
      ) ?? null
    );
  }, [empresa.data, sucursales.data]);

  const onSubmit = async (values: FormData) => {
    setFormError(null);
    try {
      await saveMutation.mutateAsync(values);
    } catch (error) {
      const apiError = error as ApiError;
      setFormError(
        apiError.response?.data?.detail ??
          "No se pudieron guardar los cambios de la empresa.",
      );
    }
  };

  const signatureUploadMutation = useMutation({
    mutationFn: async () => {
      if (!empresa.data?.id || !signatureFile) {
        throw new Error("Guarda primero la empresa y selecciona un archivo P12.");
      }
      if (signaturePassword !== signaturePasswordConfirmation) {
        throw new Error("Las contraseñas de la firma no coinciden.");
      }
      return uploadEmpresaSignature(empresa.data.id, signatureFile, signaturePassword);
    },
    onSuccess: (updatedEmpresa) => {
      queryClient.setQueryData(["empresa-canonica"], updatedEmpresa);
      queryClient.invalidateQueries({ queryKey: ["empresa-canonica"] });
      setSignatureFile(null);
      setSignaturePassword("");
      setSignaturePasswordConfirmation("");
      setSignatureError(null);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
    },
    onError: (error) =>
      setSignatureError(getApiErrorMessage(error, "No se pudo validar la firma electrónica.")),
  });

  const signatureDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!empresa.data?.id) throw new Error("No se encontró la empresa.");
      return deleteEmpresaSignature(empresa.data.id);
    },
    onSuccess: (updatedEmpresa) => {
      queryClient.setQueryData(["empresa-canonica"], updatedEmpresa);
      queryClient.invalidateQueries({ queryKey: ["empresa-canonica"] });
    },
    onError: (error) =>
      setSignatureError(getApiErrorMessage(error, "No se pudo eliminar la firma electrónica.")),
  });

  const visibleTaxes = useMemo(() => {
    const normalizedSearch = taxSearch.trim().toLocaleLowerCase("es-EC");
    return (impuestos.data ?? []).filter((item) => {
      if (item.tipo_impuesto !== taxType) return false;
      if (!normalizedSearch) return true;
      return `${item.descripcion} ${item.codigo_sri} ${item.porcentaje_iva ?? ""}`
        .toLocaleLowerCase("es-EC")
        .includes(normalizedSearch);
    });
  }, [impuestos.data, taxSearch, taxType]);

  const displayedTaxes = useMemo(() => {
    if (taxType !== "ICE") return visibleTaxes;
    const start = (icePage - 1) * ICE_PAGE_SIZE;
    return visibleTaxes.slice(start, start + ICE_PAGE_SIZE);
  }, [icePage, taxType, visibleTaxes]);

  const iceTotalPages = Math.max(1, Math.ceil(visibleTaxes.length / ICE_PAGE_SIZE));

  useEffect(() => {
    if (icePage > iceTotalPages) setIcePage(iceTotalPages);
  }, [icePage, iceTotalPages]);

  const selectedTaxes = (impuestos.data ?? []).filter((tax) =>
    selectedTaxIds.includes(tax.id),
  );

  const toggleTax = (taxId: string) => {
    const next = selectedTaxIds.includes(taxId)
      ? selectedTaxIds.filter((id) => id !== taxId)
      : [...selectedTaxIds, taxId];
    setValue("impuesto_catalogo_ids", next, { shouldDirty: true });
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > LOGO_MAX_BYTES) {
      setFormError("El logo debe tener un tamaño máximo de 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const value = loadEvent.target?.result;
      if (typeof value === "string") {
        setLogoPreview(value);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCertificateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCertificateError(null);
    if (file.type !== "application/pdf") {
      setCertificateError("Debe seleccionar un archivo PDF.");
      return;
    }
    if (file.size > RUC_CERTIFICATE_MAX_BYTES) {
      setCertificateError("El certificado PDF no puede superar 5 MB.");
      return;
    }
    certificateMutation.mutate(file, {
      onSuccess: setCertificatePreview,
      onError: (error) =>
        setCertificateError(
          getApiErrorMessage(error, "No se pudo leer el certificado RUC."),
        ),
    });
  };

  const applyCertificatePreview = () => {
    if (!certificatePreview) return;
    const values = certificatePreviewToEmpresaForm(certificatePreview);
    for (const [field, value] of Object.entries(values)) {
      setValue(field as keyof FormInput, value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (!certificatePreview.agente_retencion) {
      setValue("agente_retencion_resolucion", "", { shouldDirty: true });
    }
    if (!certificatePreview.contribuyente_especial) {
      setValue("contribuyente_especial_resolucion", "", { shouldDirty: true });
    }
    setCertificatePreview(null);
  };

  if (empresa.isLoading) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresa"
        description="Información tributaria y comercial del emisor"
        actions={
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || saveMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || saveMutation.isPending
              ? "Guardando..."
              : "Guardar cambios"}
          </Button>
        }
      />

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {!configurationStatus.fiscalComplete && (
          <ConfigurationNotice
            title="Tu negocio aún no está configurado"
            description={
              <>
                Completa {configurationStatus.missingFiscalFields.join(", ")}.
                Sin estos datos no podrás emitir comprobantes.
              </>
            }
            action={
              <Button type="button" size="sm" onClick={() => document.getElementById("empresa-identificacion")?.scrollIntoView({ behavior: "smooth" })}>
                Resolver
              </Button>
            }
          />
        )}

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <ConfigurationNotice
          variant="info"
          title="Autocompleta con tu certificado RUC"
          description="El PDF se procesa en memoria y no se almacena. Revisa los datos antes de aplicarlos al formulario."
          action={
            <>
              <input
                ref={certificateInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleCertificateChange}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={certificateMutation.isPending}
                onClick={() => certificateInputRef.current?.click()}
              >
                <FileUp className="mr-2 h-4 w-4" />
                {certificateMutation.isPending
                  ? "Procesando..."
                  : "Cargar certificado SRI"}
              </Button>
            </>
          }
        />
        {certificateError && (
          <Alert variant="destructive">
            <AlertDescription>{certificateError}</AlertDescription>
          </Alert>
        )}

        <ConfigurationPanel
          id="empresa-identificacion"
          title="Datos informativos del negocio"
          description="Identificación comercial y datos registrados ante el SRI"
          icon={Building2}
        >
          <p className="border-b pb-2 text-xs font-semibold uppercase text-primary">
            Identificación
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="RUC" required error={errors.ruc?.message}>
              <Input
                {...register("ruc")}
                maxLength={13}
                inputMode="numeric"
                onChange={(event) => {
                  setValue("ruc", event.target.value.replace(/\D/g, ""), {
                    shouldValidate: true,
                  });
                }}
              />
            </FormField>

            <FormField
              label="Razón social"
              required
              error={errors.razon_social?.message}
            >
              <Input {...register("razon_social")} />
            </FormField>

            <FormField
              label="Nombre comercial"
              error={errors.nombre_comercial?.message}
            >
              <Input {...register("nombre_comercial")} />
            </FormField>

            <FormField
              label="Tipo de contribuyente"
              required
              error={errors.tipo_contribuyente_juridico?.message}
            >
              <select
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                value={tipoJuridico}
                onChange={(event) =>
                  setValue(
                    "tipo_contribuyente_juridico",
                    event.target.value as TipoContribuyenteForm,
                    { shouldValidate: true, shouldDirty: true },
                  )
                }
              >
                <option value="">Seleccione un tipo de contribuyente</option>
                <option value="PERSONA_NATURAL">Persona natural</option>
                <option value="SOCIEDAD">Sociedad</option>
              </select>
            </FormField>
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel
          title="Información tributaria"
          description="Régimen y calificaciones tributarias del emisor"
          icon={Landmark}
          collapsible
        >
          <div className="mb-4 rounded-md border border-cyan-100 bg-cyan-50 p-3 text-sm text-cyan-900">
            La información tributaria debe coincidir con los datos registrados
            ante el Servicio de Rentas Internas.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Régimen tributario" required error={errors.regimen?.message}>
              <select
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                value={regimen}
                onChange={(event) =>
                  setValue("regimen", event.target.value as RegimenTributario, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                {regimenOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-2 md:col-span-2 sm:grid-cols-3 lg:grid-cols-5">
              <label className="flex min-h-12 items-center gap-2 rounded-md border p-3 text-sm">
                <input type="checkbox" {...register("obligado_contabilidad")} />
                Obligado a llevar contabilidad
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  {...register("contribuyente_especial")}
                  onChange={(event) => {
                    setValue("contribuyente_especial", event.target.checked, { shouldValidate: true, shouldDirty: true });
                    if (!event.target.checked) setValue("contribuyente_especial_resolucion", "", { shouldDirty: true });
                  }}
                />
                Contribuyente especial
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  {...register("gran_contribuyente")}
                  onChange={(event) => {
                    setValue("gran_contribuyente", event.target.checked, { shouldValidate: true, shouldDirty: true });
                    if (!event.target.checked) setValue("gran_contribuyente_resolucion", "", { shouldDirty: true });
                  }}
                />
                Gran contribuyente
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  {...register("agente_retencion")}
                  onChange={(event) => {
                    setValue("agente_retencion", event.target.checked, { shouldValidate: true, shouldDirty: true });
                    if (!event.target.checked) setValue("agente_retencion_resolucion", "", { shouldDirty: true });
                  }}
                />
                Agente de retención
              </label>
              <label className="flex min-h-12 items-center gap-2 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  {...register("artesano_calificado")}
                  onChange={(event) => setValue("artesano_calificado", event.target.checked, { shouldValidate: true, shouldDirty: true })}
                />
                Artesano calificado
              </label>
            </div>

            {contribuyenteEspecial && (
              <FormField label="Resolución de contribuyente especial" required error={errors.contribuyente_especial_resolucion?.message}>
                <Input {...register("contribuyente_especial_resolucion")} />
              </FormField>
            )}
            {granContribuyente && (
              <FormField label="Resolución de gran contribuyente" required error={errors.gran_contribuyente_resolucion?.message}>
                <Input {...register("gran_contribuyente_resolucion")} />
              </FormField>
            )}
            {agenteRetencion && (
              <FormField label="Resolución de agente de retención" required error={errors.agente_retencion_resolucion?.message}>
                <Input {...register("agente_retencion_resolucion")} />
              </FormField>
            )}
          </div>

          <div className="mt-6 space-y-3 border-t pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Impuestos de la empresa</h3>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Elige el tipo de impuesto y marca las tarifas que utiliza tu empresa. La configuración de impuestos por producto se mantiene por separado.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {selectedTaxes.length} seleccionados
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(180px,0.7fr)_2fr]">
              <nav aria-label="Tipo de impuesto" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                {TAX_TYPES.map((type) => {
                  const count = impuestos.data?.filter((tax) => tax.tipo_impuesto === type.value).length ?? 0;
                  const active = taxType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setTaxType(type.value);
                        setTaxSearch("");
                        setIcePage(1);
                      }}
                      className={`flex min-w-32 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors lg:min-w-0 ${
                        active
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border bg-background hover:bg-muted/50"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-semibold">{type.label}</span>
                        <span className="hidden text-xs text-muted-foreground lg:block">{type.description}</span>
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
                    </button>
                  );
                })}
              </nav>

              <section aria-label={`Opciones ${taxType}`} className="min-w-0 rounded-xl border bg-card p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">{TAX_TYPES.find((type) => type.value === taxType)?.description}</h4>
                    <p className="text-xs text-muted-foreground">
                      {visibleTaxes.length} opciones vigentes
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={taxSearch}
                      onChange={(event) => {
                        setTaxSearch(event.target.value);
                        setIcePage(1);
                      }}
                      placeholder={`Buscar ${taxType}...`}
                      aria-label={`Buscar opciones de ${taxType}`}
                      className="pl-9"
                    />
                  </div>
                </div>

                {impuestos.isLoading ? (
                  <div className="space-y-2" aria-label="Cargando catálogo de impuestos">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : impuestos.isError ? (
                  <Alert variant="destructive">
                    <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                      No se pudo cargar el catálogo de impuestos.
                      <Button type="button" size="sm" variant="outline" onClick={() => impuestos.refetch()}>Reintentar</Button>
                    </AlertDescription>
                  </Alert>
                ) : visibleTaxes.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="font-medium">No hay opciones para mostrar</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prueba otra búsqueda o revisa el catálogo vigente del SRI.
                    </p>
                  </div>
                ) : (
                  <ul className={`grid gap-2 ${taxType === "IVA" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
                    {displayedTaxes.map((tax) => {
                      const selected = selectedTaxIds.includes(tax.id);
                      const rate = tax.tipo_impuesto === "IVA"
                        ? tax.porcentaje_iva != null ? `${tax.porcentaje_iva}%` : null
                        : tax.tarifa_ad_valorem != null
                          ? `${tax.tarifa_ad_valorem}% ad valorem`
                          : tax.tarifa_especifica != null
                            ? `Tarifa específica ${tax.tarifa_especifica}`
                            : null;
                      return (
                        <li key={tax.id}>
                          <label className={`flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/40 hover:bg-muted/30"}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleTax(tax.id)}
                              className="mt-1 h-4 w-4 accent-primary"
                              aria-label={`Seleccionar ${tax.descripcion}`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium">{tax.descripcion}</span>
                                {rate && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{rate}</span>}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                Código SRI {tax.codigo_sri}
                                {tax.clasificacion_iva ? ` · ${tax.clasificacion_iva.replaceAll("_", " ")}` : ""}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {taxType === "ICE" && visibleTaxes.length > ICE_PAGE_SIZE && (
                  <TablePagination
                    page={icePage}
                    pageSize={ICE_PAGE_SIZE}
                    total={visibleTaxes.length}
                    totalPages={iceTotalPages}
                    onPageChange={setIcePage}
                    itemLabel="impuestos ICE"
                    className="mt-3 border-t pt-3"
                  />
                )}
              </section>
            </div>

            {selectedTaxes.length > 0 && (
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Seleccionados: {selectedTaxes.map((tax) => tax.descripcion).join(" · ")}
              </div>
            )}
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel title="Ubicación y contacto" icon={MapPin}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Dirección matriz"
            required
            error={errors.direccion_matriz?.message}
            className="md:col-span-2"
          >
            <Input {...register("direccion_matriz")} />
          </FormField>
            <FormField label="Correo electrónico" error={errors.email?.message}>
              <Input {...register("email")} />
            </FormField>
            <FormField label="Teléfono" error={errors.telefono?.message}>
              <Input
                {...register("telefono")}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) => {
                  setValue("telefono", event.target.value.replace(/\D/g, ""), {
                    shouldValidate: true,
                  });
                }}
              />
            </FormField>
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel
          title="Identidad comercial"
          description="Logo utilizado en comprobantes y documentos impresos"
          icon={Mail}
          collapsible
        >
          <div className="space-y-4">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo de empresa"
                className="h-24 w-auto max-w-72 rounded border bg-muted/10 object-contain p-1"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                No hay logo configurado.
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Cambiar logo
              </Button>
              <Button type="button" variant="outline" onClick={clearLogo}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos permitidos: PNG, JPG, WEBP, SVG. Tamaño máximo: 2 MB.
            </p>
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel
          title="Opciones para la facturación"
          description="Modo autorizado para emitir comprobantes"
          icon={ReceiptText}
          collapsible
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Modo de emisión" required>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={modoEmision}
                onChange={(event) =>
                  setValue(
                    "modo_emision",
                    event.target.value as FormData["modo_emision"],
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
              >
                <option value="ELECTRONICO">Comprobantes electrónicos</option>
                {puedeEmitirNotaVenta && (
                  <option value="NOTA_VENTA_FISICA">Nota de venta física</option>
                )}
              </select>
            </FormField>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Configuración relacionada</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild type="button" size="sm" variant="outline">
                  <Link to="/configuracion-operativa">Puntos y secuenciales</Link>
                </Button>
                <Button asChild type="button" size="sm" variant="outline">
                  <Link to="/impuestos">Catálogo de impuestos</Link>
                </Button>
              </div>
            </div>
          </div>
        </ConfigurationPanel>

        {modoEmision === "ELECTRONICO" && (
          <ConfigurationPanel
            title="Firma electrónica"
            description="Certificado requerido para emitir comprobantes electrónicos. Se valida y cifra en el servidor; la contraseña no se guarda en el formulario."
            icon={KeyRound}
            collapsible
          >
            {empresa.data?.firma_electronica_configurada ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <div>
                  <p className="font-medium">Firma electrónica configurada</p>
                  <p>{empresa.data.firma_nombre_archivo ?? "Certificado empresarial"}</p>
                  <p className="text-xs">Caduca: {empresa.data.firma_caduca_en ? new Date(empresa.data.firma_caduca_en).toLocaleDateString("es-EC") : "Fecha no disponible"}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={signatureDeleteMutation.isPending}
                  onClick={() => signatureDeleteMutation.mutate()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar firma
                </Button>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  Falta la firma electrónica. Guarda primero la empresa y carga un certificado vigente antes de encolar facturas electrónicas.
                </AlertDescription>
              </Alert>
            )}

            {signatureError && (
              <Alert className="mt-3" variant="destructive">
                <AlertDescription>{signatureError}</AlertDescription>
              </Alert>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField label="Archivo de firma (.p12 / .pfx)" required>
                <Input
                  ref={signatureInputRef}
                  type="file"
                  accept=".p12,.pfx,application/x-pkcs12"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSignatureError(null);
                    if (file && file.size > 5 * 1024 * 1024) {
                      setSignatureError("La firma electrónica no puede superar 5 MB.");
                      event.target.value = "";
                      setSignatureFile(null);
                      return;
                    }
                    setSignatureFile(file);
                  }}
                />
              </FormField>
              <FormField label="Contraseña de la firma" required>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={signaturePassword}
                  onChange={(event) => setSignaturePassword(event.target.value)}
                />
              </FormField>
              <FormField label="Confirmar contraseña" required>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={signaturePasswordConfirmation}
                  onChange={(event) => setSignaturePasswordConfirmation(event.target.value)}
                />
              </FormField>
            </div>
            <Button
              type="button"
              className="mt-4"
              disabled={
                !empresa.data?.id ||
                !signatureFile ||
                !signaturePassword ||
                !signaturePasswordConfirmation ||
                signatureUploadMutation.isPending
              }
              onClick={() => signatureUploadMutation.mutate()}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {signatureUploadMutation.isPending ? "Validando firma..." : "Validar y guardar firma"}
            </Button>
            {!empresa.data?.id && (
              <p className="mt-2 text-xs text-muted-foreground">Guarda la empresa antes de cargar el certificado.</p>
            )}
          </ConfigurationPanel>
        )}

        <ConfigurationPanel
          title="Establecimiento matriz"
          description="Sucursal principal asociada al emisor"
          icon={FileText}
          collapsible
        >
          {sucursales.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : matriz ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {matriz.codigo} · {matriz.nombre}
              </p>
              <p className="text-sm text-muted-foreground">{matriz.direccion}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No se encontró un establecimiento matriz activo para esta empresa.
            </p>
          )}
          <Button asChild className="mt-3" variant="outline">
            <Link to="/configuracion-operativa">Ver sucursales y puntos de emisión</Link>
          </Button>
        </ConfigurationPanel>
      </form>

      <DetailModal
        open={saved}
        onClose={() => setSaved(false)}
        title="Cambios guardados"
        subtitle="La configuración de empresa se actualizó correctamente."
      />

      {certificatePreview && (
        <DetailModal
          open
          onClose={() => setCertificatePreview(null)}
          title="Datos detectados en el certificado RUC"
          subtitle="Estos datos todavía no se han guardado."
          size="lg"
          sections={[
            {
              title: "Campos aplicables",
              fields: [
                { label: "RUC", value: certificatePreview.ruc },
                { label: "Razón social", value: certificatePreview.razon_social },
                {
                  label: "Tipo de contribuyente",
                  value:
                    certificatePreview.tipo_contribuyente_juridico ===
                    "PERSONA_NATURAL"
                      ? "Persona natural"
                      : "Sociedad",
                },
                { label: "Régimen", value: certificatePreview.regimen },
                {
                  label: "Obligado a contabilidad",
                  value: certificatePreview.obligado_contabilidad ? "Sí" : "No",
                },
                {
                  label: "Agente de retención",
                  value: certificatePreview.agente_retencion ? "Sí" : "No",
                },
                {
                  label: "Contribuyente especial",
                  value: certificatePreview.contribuyente_especial ? "Sí" : "No",
                },
                {
                  label: "Dirección",
                  value: certificatePreview.direccion_matriz,
                  full: true,
                },
              ],
            },
            {
              title: "Información adicional detectada",
              fields: [
                { label: "Estado", value: certificatePreview.additional.estado ?? "—" },
                { label: "Artesano", value: certificatePreview.additional.artesano ?? "—" },
                {
                  label: "Ubicación",
                  value: [
                    certificatePreview.additional.provincia,
                    certificatePreview.additional.canton,
                    certificatePreview.additional.parroquia,
                  ]
                    .filter(Boolean)
                    .join(" / ") || "—",
                },
                {
                  label: "Código de verificación",
                  value: certificatePreview.additional.codigo_verificacion ?? "—",
                },
                {
                  label: "Actividades",
                  value:
                    certificatePreview.additional.actividades_economicas.join(" · ") ||
                    "—",
                  full: true,
                },
                {
                  label: "Obligaciones",
                  value:
                    certificatePreview.additional.obligaciones_tributarias.join(" · ") ||
                    "—",
                  full: true,
                },
              ],
            },
          ]}
          footer={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setCertificatePreview(null)}>
                Cancelar
              </Button>
              <Button onClick={applyCertificatePreview}>Aplicar al formulario</Button>
            </div>
          }
        >
          {certificatePreview.warnings.length > 0 && (
            <Alert>
              <AlertDescription>
                {certificatePreview.warnings.join(" ")}
              </AlertDescription>
            </Alert>
          )}
        </DetailModal>
      )}
    </div>
  );
}
