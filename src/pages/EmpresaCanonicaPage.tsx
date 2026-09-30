import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  FileText,
  Landmark,
  Mail,
  MapPin,
  ReceiptText,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/api";
import {
  buildEmpresaConfigurationStatus,
  type RegimenTributario,
  type TipoContribuyenteJuridico,
} from "@/features/empresa/hooks";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

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
  direccion_matriz: string;
  email: string | null;
  telefono: string | null;
  logo: string | null;
  modo_emision: string;
  tipo_contribuyente_id: string;
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (
      regimen !== "RIMPE_NEGOCIO_POPULAR" &&
      modoEmision === "NOTA_VENTA_FISICA"
    ) {
      setValue("modo_emision", "ELECTRONICO", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [modoEmision, regimen, setValue]);

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

            <label className="flex items-center gap-2 pt-8 text-sm">
              <input type="checkbox" {...register("obligado_contabilidad")} />
              Obligado a llevar contabilidad
            </label>

            <div className="md:col-span-2 rounded-md border border-border p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  {...register("contribuyente_especial")}
                  onChange={(event) => {
                    setValue("contribuyente_especial", event.target.checked, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    if (!event.target.checked) {
                      setValue("contribuyente_especial_resolucion", "", {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                />
                Contribuyente especial
              </label>
              {contribuyenteEspecial && (
                <div className="mt-3 max-w-md">
                  <FormField
                    label="Número de resolución"
                    required
                    error={errors.contribuyente_especial_resolucion?.message}
                  >
                    <Input {...register("contribuyente_especial_resolucion")} />
                  </FormField>
                </div>
              )}
            </div>

            <div className="md:col-span-2 rounded-md border border-border p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  {...register("gran_contribuyente")}
                  onChange={(event) => {
                    setValue("gran_contribuyente", event.target.checked, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    if (!event.target.checked) {
                      setValue("gran_contribuyente_resolucion", "", {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                />
                Gran contribuyente
              </label>
              {granContribuyente && (
                <div className="mt-3 max-w-md">
                  <FormField
                    label="Número de resolución"
                    required
                    error={errors.gran_contribuyente_resolucion?.message}
                  >
                    <Input {...register("gran_contribuyente_resolucion")} />
                  </FormField>
                </div>
              )}
            </div>

            <div className="md:col-span-2 rounded-md border border-border p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  {...register("agente_retencion")}
                  onChange={(event) => {
                    setValue("agente_retencion", event.target.checked, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    if (!event.target.checked) {
                      setValue("agente_retencion_resolucion", "", {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                />
                Agente de retención
              </label>
              {agenteRetencion && (
                <div className="mt-3 max-w-md">
                  <FormField
                    label="Número de resolución"
                    required
                    error={errors.agente_retencion_resolucion?.message}
                  >
                    <Input {...register("agente_retencion_resolucion")} />
                  </FormField>
                </div>
              )}
            </div>
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
                {regimen === "RIMPE_NEGOCIO_POPULAR" && (
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
          <ConfigurationNotice
            variant="info"
            title="Opciones comerciales pendientes"
            description="Precio editable, reembolso de gastos y propinas requieren reglas de negocio antes de habilitarse."
          />
        </ConfigurationPanel>

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
    </div>
  );
}
