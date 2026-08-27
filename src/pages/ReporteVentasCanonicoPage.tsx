import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import api from "@/lib/api";

type Reporte = { fecha_inicio: string; fecha_fin: string; subtotal_0: string; subtotal_12: string; monto_iva: string; total: string; total_ventas: number };
const money = (value: string | number) => `$ ${Number(value).toFixed(2)}`;

export default function ReporteVentasCanonicoPage() {
  const today = new Date();
  const [inicio, setInicio] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [fin, setFin] = useState(today.toISOString().slice(0, 10));
  const reporte = useQuery({ queryKey: ["reporte-ventas-canonico", inicio, fin], queryFn: async () => (await api.get<Reporte>("/reportes/ventas/resumen", { params: { fecha_inicio: inicio, fecha_fin: fin } })).data, enabled: Boolean(inicio && fin) });
  const cards = reporte.data ? [{ label: "Facturas", value: String(reporte.data.total_ventas) }, { label: "Subtotal 0%", value: money(reporte.data.subtotal_0) }, { label: "Subtotal IVA", value: money(reporte.data.subtotal_12) }, { label: "IVA", value: money(reporte.data.monto_iva) }, { label: "Total vendido", value: money(reporte.data.total) }] : [];
  return <div><PageHeader title="Reporte de ventas" description="Resumen canónico de ventas emitidas por período" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-6 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium">Desde<Input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Hasta<Input type="date" value={fin} onChange={(event) => setFin(event.target.value)} /></label></div>{reporte.isLoading && <p className="text-sm text-muted-foreground">Cargando reporte...</p>}{reporte.isError && <p className="text-sm text-destructive">No se pudo cargar el reporte de ventas.</p>}{reporte.data && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{cards.map((card) => <div className="rounded-lg border p-4" key={card.label}><div className="mb-2 text-sm text-muted-foreground">{card.label}</div><div className="text-2xl font-semibold">{card.value}</div></div>)}</div>}</div>;
}
