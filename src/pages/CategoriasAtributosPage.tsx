import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { getValoresCatalogo } from "@/features/productos/api";
import { useCatalogs } from "@/features/catalog/catalogHooks";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface Option {
  id: string;
  nombre: string;
}

interface AttributeOption extends Option {
  tipo_dato: string;
  select_options?: string[] | null;
  catalog_id?: string | null;
}

interface Assignment {
  id: string;
  categoria_id: string;
  atributo_id: string;
  orden: number | null;
  obligatorio: boolean | null;
  valor_default: string | null;
}

function safeDefault(attribute: AttributeOption | undefined) {
  if (!attribute) return "";
  switch (attribute.tipo_dato) {
    case "string": return "N/A";
    case "integer": return "0";
    case "decimal": return "0.00";
    case "boolean": return "false";
    case "date": return new Date().toISOString().slice(0, 10);
    case "select": return attribute.select_options?.[0] ?? "";
    default: return "";
  }
}

export default function CategoriasAtributosPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const categories = useQuery({
    queryKey: ["categorias-canonicas"],
    queryFn: async () => (await api.get<{ items: Option[] }>("/categorias", { params: { limit: 1000, offset: 0, only_active: true } })).data.items,
  });
  const attributes = useQuery({
    queryKey: ["atributos-canonicos"],
    queryFn: async () => (await api.get<{ items: AttributeOption[] }>("/atributos", { params: { limit: 1000, offset: 0, only_active: true } })).data.items,
  });
  const assignments = useQuery({
    queryKey: ["categorias-atributos"],
    queryFn: async () => (await api.get<Assignment[]>("/categorias-atributos", { params: { limit: 1000 } })).data,
  });
  const catalogs = useCatalogs();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ categoria_id: "", atributo_id: "", obligatorio: false, valor_default: "" });
  const selectedAttribute = attributes.data?.find((item) => item.id === form.atributo_id);
  const catalogValues = useQuery({
    queryKey: ["catalogo-valores", selectedAttribute?.catalog_id],
    queryFn: () => getValoresCatalogo(selectedAttribute!.catalog_id!),
    enabled: selectedAttribute?.tipo_dato === "catalog" && Boolean(selectedAttribute.catalog_id),
  });
  useEffect(() => {
    if (
      form.obligatorio &&
      selectedAttribute?.tipo_dato === "catalog" &&
      !form.valor_default &&
      catalogValues.data?.length
    ) {
      setForm((current) => ({ ...current, valor_default: catalogValues.data![0].value }));
    }
  }, [catalogValues.data, form.obligatorio, form.valor_default, selectedAttribute?.tipo_dato]);
  const create = useMutation({
    mutationFn: async () => (await api.post("/categorias-atributos", {
      categoria_id: form.categoria_id,
      atributo_id: form.atributo_id,
      obligatorio: form.obligatorio,
      valor_default: form.valor_default || undefined,
      usuario_auditoria: "frontend",
    })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-atributos"] });
      setOpen(false);
      toast({ variant: "success", title: "Atributo asignado" });
    },
  });

  const categoryName = (id: string) => categories.data?.find((item) => item.id === id)?.nombre || id;
  const attributeName = (id: string) => attributes.data?.find((item) => item.id === id)?.nombre || id;
  const columns: Column<Assignment>[] = [
    { key: "categoria", header: "Categoría", cell: (row) => categoryName(row.categoria_id) },
    { key: "atributo", header: "Atributo", cell: (row) => attributeName(row.atributo_id) },
    { key: "obligatorio", header: "Obligatorio", cell: (row) => row.obligatorio ? "Sí" : "No" },
    { key: "default", header: "Valor por defecto", cell: (row) => row.valor_default || "—" },
  ];

  const handleAttributeChange = (attributeId: string) => {
    const attribute = attributes.data?.find((item) => item.id === attributeId);
    setForm((current) => ({
      ...current,
      atributo_id: attributeId,
      valor_default: current.obligatorio ? safeDefault(attribute) : "",
    }));
  };

  const handleRequiredChange = (obligatorio: boolean) => {
    setForm((current) => ({
      ...current,
      obligatorio,
      valor_default: obligatorio ? (current.valor_default || safeDefault(selectedAttribute)) : "",
    }));
  };

  const renderDefaultControl = () => {
    if (!selectedAttribute) return <Input value={form.valor_default} onChange={(event) => setForm({ ...form, valor_default: event.target.value })} />;
    if (selectedAttribute.tipo_dato === "select") {
      return <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.valor_default} onChange={(event) => setForm({ ...form, valor_default: event.target.value })}><option value="">Selecciona una opción</option>{(selectedAttribute.select_options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
    }
    if (selectedAttribute.tipo_dato === "catalog") {
      return <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.valor_default} onChange={(event) => setForm({ ...form, valor_default: event.target.value })}><option value="">Selecciona un valor</option>{(catalogValues.data ?? []).map((option) => <option key={option.id} value={option.value}>{option.value}</option>)}</select>;
    }
    if (selectedAttribute.tipo_dato === "boolean") {
      return <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.valor_default} onChange={(event) => setForm({ ...form, valor_default: event.target.value })}><option value="">Selecciona</option><option value="true">Sí</option><option value="false">No</option></select>;
    }
    const type = selectedAttribute.tipo_dato;
    return <Input type={type === "integer" || type === "decimal" ? "number" : type === "date" ? "date" : "text"} step={type === "integer" ? "1" : type === "decimal" ? "any" : undefined} value={form.valor_default} onChange={(event) => setForm({ ...form, valor_default: event.target.value })} />;
  };

  return (
    <div>
      <PageHeader title="Atributos por categoría" description="Define qué campos dinámicos aplican a cada categoría" actions={<Button onClick={() => { setForm({ categoria_id: "", atributo_id: "", obligatorio: false, valor_default: "" }); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Asignar atributo</Button>} />
      <DataTable columns={columns} data={assignments.data ?? []} rowKey={(row) => row.id} isLoading={assignments.isLoading} isError={assignments.isError} onRetry={assignments.refetch} emptyHeading="No hay asignaciones" emptyDescription="Asigna atributos a categorías para personalizar productos." />
      <DetailModal open={open} onClose={() => setOpen(false)} title="Asignar atributo" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => create.mutate()} disabled={create.isPending || !form.categoria_id || !form.atributo_id || (form.obligatorio && !form.valor_default) || (selectedAttribute?.tipo_dato === "catalog" && catalogValues.isLoading)}>{create.isPending ? "Guardando..." : "Guardar"}</Button></div>}>
        <div className="space-y-4">
          <FormField label="Categoría" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.categoria_id} onChange={(event) => setForm({ ...form, categoria_id: event.target.value })}><option value="">Selecciona una categoría</option>{(categories.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></FormField>
          <FormField label="Atributo" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.atributo_id} onChange={(event) => handleAttributeChange(event.target.value)}><option value="">Selecciona un atributo</option>{(attributes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.tipo_dato})</option>)}</select></FormField>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.obligatorio} onChange={(event) => handleRequiredChange(event.target.checked)} /> Obligatorio</label>
          <FormField label="Valor por defecto" required={form.obligatorio}>{renderDefaultControl()}</FormField>
          {selectedAttribute?.tipo_dato === "catalog" && !catalogs.data?.some((catalog) => catalog.id === selectedAttribute.catalog_id) && <p className="text-xs text-amber-700">El catálogo asociado no está disponible. Revisa la definición del atributo.</p>}
        </div>
      </DetailModal>
    </div>
  );
}