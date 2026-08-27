import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";

type Row = { estado: string; tipo_documento: string; cantidad: number };

export default function ReporteSRIPage() {
  const today = new Date();
  const [inicio, setInicio] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [fin, setFin] = useState(today.toISOString().slice(0, 10));
  const reporte = useQuery({ queryKey: ["reporte-monitor-sri", inicio, fin], queryFn: async () => (await api.get<Row[]>("/reportes/sri/monitor-estados", { params: { fecha_inicio: inicio, fecha_fin: fin } })).data, enabled: Boolean(inicio && fin) });
  const total = (reporte.data ?? []).reduce((sum, row) => sum + row.cantidad, 0);
  const autorizados = (reporte.data ?? []).filter((row) => row.estado === "AUTORIZADO").reduce((sum, row) => sum + row.cantidad, 0);
  const columns: Column<Row>[] = [{ key: "tipo", header: "Tipo documento", cell: (row) => row.tipo_documento }, { key: "estado", header: "Estado SRI", cell: (row) => row.estado }, { key: "cantidad", header: "Cantidad", cell: (row) => row.cantidad, align: "right" }];
  return <div><PageHeader title="Monitor SRI" description="Consulta estados de facturas y retenciones electrónicas" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium">Desde<Input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Hasta<Input type="date" value={fin} onChange={(event) => setFin(event.target.value)} /></label><div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm"><span className="text-muted-foreground">Documentos</span><strong className="ml-3">{total}</strong></div><div className="rounded-lg border bg-emerald-50 px-4 py-2 text-sm"><span className="text-emerald-700">Autorizados</span><strong className="ml-3 text-emerald-800">{autorizados}</strong></div></div><DataTable columns={columns} data={reporte.data ?? []} rowKey={(row) => `${row.tipo_documento}-${row.estado}`} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading="Sin documentos en el período" emptyDescription="Selecciona otro rango para consultar estados SRI." /></div>;
}
