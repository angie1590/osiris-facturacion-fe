import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

type Bloque = { base_0: string; base_iva: string; monto_iva: string; total: string; total_documentos: number };
type Reporte = { mes: number; anio: number; ventas: Bloque; compras: Bloque; retenciones_emitidas: Record<string, string>; retenciones_recibidas: Record<string, string> };
const money = (value: string | number) => `$ ${Number(value).toFixed(2)}`;

export default function ReporteTributarioPage() {
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1));
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const reporte = useQuery({ queryKey: ["reporte-tributario", mes, anio], queryFn: async () => (await api.get<Reporte>("/reportes/impuestos/mensual", { params: { mes: Number(mes), anio: Number(anio) } })).data, enabled: Number(mes) >= 1 && Number(mes) <= 12 && Number(anio) >= 2000 });
  const block = (title: string, value: Bloque) => <div className="rounded-lg border p-4"><h2 className="mb-3 font-semibold">{title}</h2><div className="grid gap-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Documentos</span><strong>{value.total_documentos}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Base 0%</span><strong>{money(value.base_0)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Base IVA</span><strong>{money(value.base_iva)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">IVA</span><strong>{money(value.monto_iva)}</strong></div><div className="flex justify-between border-t pt-2"><span>Total</span><strong>{money(value.total)}</strong></div></div></div>;
  const retentionRows = (values: Record<string, string>) => Object.entries(values).map(([code, value]) => <div className="flex justify-between border-b py-2 text-sm" key={code}><span>Código {code}</span><strong>{money(value)}</strong></div>);
  return <div><PageHeader title="Reporte tributario mensual" description="Resumen fiscal de ventas, compras y retenciones" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium">Mes<Input type="number" min="1" max="12" value={mes} onChange={(event) => setMes(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Año<Input type="number" min="2000" max="2100" value={anio} onChange={(event) => setAnio(event.target.value)} /></label></div>{reporte.data && <><div className="grid gap-4 md:grid-cols-2">{block("Ventas", reporte.data.ventas)}{block("Compras", reporte.data.compras)}</div><div className="mt-4 grid gap-4 md:grid-cols-2"><div className="rounded-lg border p-4"><h2 className="mb-2 font-semibold">Retenciones emitidas</h2>{retentionRows(reporte.data.retenciones_emitidas)}</div><div className="rounded-lg border p-4"><h2 className="mb-2 font-semibold">Retenciones recibidas</h2>{retentionRows(reporte.data.retenciones_recibidas)}</div></div></>}{reporte.isLoading && <p className="text-sm text-muted-foreground">Cargando reporte...</p>}{reporte.isError && <p className="text-sm text-destructive">No se pudo cargar el reporte tributario.</p>}{!reporte.isLoading && !reporte.isError && !reporte.data && <p className="text-sm text-muted-foreground">Selecciona un mes y año válidos.</p>}</div>;
}
