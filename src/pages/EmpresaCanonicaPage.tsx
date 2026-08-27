import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { useTiposContribuyente } from "@/features/personas/hooks";

type Empresa = { id: string; razon_social: string; nombre_comercial: string | null; ruc: string; direccion_matriz: string; telefono: string | null; logo: string | null; obligado_contabilidad: boolean; regimen: string; modo_emision: string; tipo_contribuyente_id: string };

export default function EmpresaCanonicaPage() {
  const queryClient = useQueryClient();
  const empresa = useQuery({ queryKey: ["empresa-canonica"], queryFn: async () => (await api.get<{ items: Empresa[] }>("/empresas", { params: { limit: 1, offset: 0, only_active: true } })).data.items[0] });
  const { data: contribuyentes = [] } = useTiposContribuyente();
  const [form, setForm] = useState<Empresa | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (empresa.data && !form) setForm(empresa.data); }, [empresa.data, form]);
  const update = useMutation({ mutationFn: async () => (await api.put(`/empresas/${form!.id}`, { ...form, usuario_auditoria: "frontend" })).data, onSuccess: (data) => { queryClient.setQueryData(["empresa-canonica"], data); setForm(data); setSaved(true); } });
  if (empresa.isLoading || !form) return <Skeleton className="h-64 w-full" />;
  return <div><PageHeader title="Empresa" description="Configuración tributaria y datos principales de la empresa" actions={<Button onClick={() => update.mutate()} disabled={update.isPending}><Save className="mr-2 h-4 w-4" />{update.isPending ? "Guardando..." : "Guardar cambios"}</Button>} /><div className="grid gap-4 rounded-lg border border-border bg-card p-6 md:grid-cols-2"><FormField label="Razón social" required><Input value={form.razon_social} onChange={(event) => setForm({ ...form, razon_social: event.target.value })} /></FormField><FormField label="Nombre comercial"><Input value={form.nombre_comercial ?? ""} onChange={(event) => setForm({ ...form, nombre_comercial: event.target.value })} /></FormField><FormField label="RUC" required><Input value={form.ruc} maxLength={13} onChange={(event) => setForm({ ...form, ruc: event.target.value.replace(/\D/g, "") })} /></FormField><FormField label="Teléfono"><Input value={form.telefono ?? ""} onChange={(event) => setForm({ ...form, telefono: event.target.value.replace(/\D/g, "") })} /></FormField><FormField label="Dirección matriz" required className="md:col-span-2"><Input value={form.direccion_matriz} onChange={(event) => setForm({ ...form, direccion_matriz: event.target.value })} /></FormField><FormField label="Tipo de contribuyente" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.tipo_contribuyente_id} onChange={(event) => setForm({ ...form, tipo_contribuyente_id: event.target.value })}>{contribuyentes.map((item) => <option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></FormField><FormField label="Régimen" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.regimen} onChange={(event) => setForm({ ...form, regimen: event.target.value })}><option value="GENERAL">General</option><option value="RIMPE_EMPRENDEDOR">RIMPE Emprendedor</option><option value="RIMPE_NEGOCIO_POPULAR">RIMPE Negocio Popular</option></select></FormField><FormField label="Modo de emisión" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.modo_emision} onChange={(event) => setForm({ ...form, modo_emision: event.target.value })}><option value="ELECTRONICO">Electrónico</option><option value="NOTA_VENTA_FISICA">Nota de venta física</option></select></FormField><label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={form.obligado_contabilidad} onChange={(event) => setForm({ ...form, obligado_contabilidad: event.target.checked })} /> Obligado a llevar contabilidad</label></div><DetailModal open={saved} onClose={() => setSaved(false)} title="Cambios guardados" subtitle="La configuración de la empresa fue actualizada correctamente." /></div>;
}
