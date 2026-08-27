import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";

type Row = { periodo: string; total: string; total_ventas: number };
const money = (value: string | number) => `$ ${Number(value).toFixed(2)}`;

export default function ReporteTendenciasVentasPage() {
  const today = new Date();
  const [inicio, setInicio] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [fin, setFin] = useState(today.toISOString().slice(0, 10));
  const [agrupacion, setAgrupacion] = useState("DIARIA");
  const reporte = useQuery({ queryKey: ["reporte-tendencias-ventas", inicio, fin, agrupacion], queryFn: async () => (await api.get<Row[]>("/reportes/ventas/tendencias", { params: { fecha_inicio: inicio, fecha_fin: fin, agrupacion } })).data, enabled: Boolean(inicio && fin) });
  const total = (reporte.data ?? []).reduce((sum, row) => sum + Number(row.total), 0);
  const ventas = (reporte.data ?? []).reduce((sum, row) => sum + row.total_ventas, 0);
  const columns: Column<Row>[] = [{ key: "periodo", header: "Período", cell: (row) => row.periodo, sortable: true, sortAccessor: (row) => row.periodo }, { key: "cantidad", header: "Ventas", cell: (row) => row.total_ventas, align: "right" }, { key: "total", header: "Total", cell: (row) => money(row.total), align: "right" }];
  return <div><PageHeader title="Tendencias de ventas" description="Evolución de ventas por día, mes o año" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium">Desde<Input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Hasta<Input type="date" value={fin} onChange={(event) => setFin(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Agrupación<select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={agrupacion} onChange={(event) => setAgrupacion(event.target.value)}><option>DIARIA</option><option>MENSUAL</option><option>ANUAL</option></select></label><div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm"><span className="text-muted-foreground">Ventas</span><strong className="ml-3">{ventas}</strong><span className="ml-4 text-muted-foreground">Total</span><strong className="ml-3">{money(total)}</strong></div></div><DataTable columns={columns} data={reporte.data ?? []} rowKey={(row) => row.periodo} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading="Sin ventas en el período" emptyDescription="Selecciona otro rango para consultar la tendencia." /></div>;
}
