import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import api from "@/lib/api";
import { useCatalogs } from "@/features/catalog/catalogHooks";

interface Atributo { id: string; nombre: string; tipo_dato: string; activo: boolean; select_options?: string[] | null; catalog_id?: string | null; allow_negative?: boolean; min_value?: string | null; max_value?: string | null; }
const types = ["string", "integer", "decimal", "boolean", "date", "select", "catalog"];

export default function AtributosPage() {
  const queryClient = useQueryClient();
  const { data: catalogs = [] } = useCatalogs();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["atributos-canonicos"], queryFn: async () => (await api.get<{ items: Atributo[] }>("/atributos", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const create = useMutation({ mutationFn: async (input: { nombre: string; tipo_dato: string; select_options?: string[]; catalog_id?: string; allow_negative?: boolean; min_value?: number; max_value?: number }) => (await api.post("/atributos", { ...input, usuario_auditoria: "frontend" })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["atributos-canonicos"] }); setOpen(false); setNombre(""); setSelectOptions(""); setCatalogId(""); } });
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("string");
  const [selectOptions, setSelectOptions] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [allowNegative, setAllowNegative] = useState(false);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [formError, setFormError] = useState("");
  const columns: Column<Atributo>[] = [
    { key: "nombre", header: "Atributo", cell: (row) => row.nombre, sortable: true, sortAccessor: (row) => row.nombre },
    { key: "tipo", header: "Tipo de dato", cell: (row) => row.tipo_dato === "string" ? "Texto" : row.tipo_dato },
  ];
  return <div><PageHeader title="Atributos" description="Campos dinámicos reutilizables para productos y categorías" actions={<Button onClick={() => { setFormError(""); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nuevo atributo</Button>} /><DataTable columns={columns} data={data ?? []} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay atributos" emptyDescription="Crea atributos para extender el catálogo de productos." /><DetailModal open={open} onClose={() => setOpen(false)} title="Nuevo atributo" footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => { const options = selectOptions.split(",").map((item) => item.trim()).filter(Boolean); if (tipo === "select" && !options.length) { setFormError("Un atributo select requiere al menos una opción."); return; } create.mutate({ nombre, tipo_dato: tipo, select_options: tipo === "select" ? options : undefined, catalog_id: tipo === "catalog" ? catalogId || undefined : undefined, allow_negative: ["integer", "decimal"].includes(tipo) ? allowNegative : false, min_value: minValue ? Number(minValue) : undefined, max_value: maxValue ? Number(maxValue) : undefined }); }} disabled={create.isPending || !nombre.trim()}>Guardar</Button></div>}><div className="space-y-4">{formError && <p className="text-sm text-destructive">{formError}</p>}<FormField label="Nombre" required><Input value={nombre} onChange={(event) => setNombre(event.target.value)} /></FormField><FormField label="Tipo de dato" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={tipo} onChange={(event) => setTipo(event.target.value)}>{types.map((item) => <option key={item} value={item}>{item === "string" ? "Texto" : item}</option>)}</select></FormField>{tipo === "select" && <FormField label="Opciones separadas por coma" required><Input value={selectOptions} onChange={(event) => setSelectOptions(event.target.value)} placeholder="rojo, verde, azul" /></FormField>}{tipo === "catalog" && <FormField label="Catálogo" hint="Si no eliges uno, se crea automáticamente a partir del nombre."><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={catalogId} onChange={(event) => setCatalogId(event.target.value)}><option value="">Crear automáticamente</option>{catalogs.map((catalog) => <option key={catalog.id} value={catalog.id}>{catalog.name}</option>)}</select></FormField>}{["integer", "decimal"].includes(tipo) && <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allowNegative} onChange={(event) => setAllowNegative(event.target.checked)} />Permite valores negativos</label><div className="grid grid-cols-2 gap-3"><FormField label="Mínimo"><Input type="number" step={tipo === "integer" ? "1" : "any"} value={minValue} onChange={(event) => setMinValue(event.target.value)} /></FormField><FormField label="Máximo"><Input type="number" step={tipo === "integer" ? "1" : "any"} value={maxValue} onChange={(event) => setMaxValue(event.target.value)} /></FormField></div></>}</div></DetailModal></div>;
}
