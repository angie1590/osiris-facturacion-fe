import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";

type Row = { usuario_id: string | null; vendedor: string; total_vendido: string; facturas_emitidas: number };
const money = (value: string | number) => `$ ${Number(value).toFixed(2)}`;

export default function ReporteVendedoresPage() {
  const today = new Date();
  const [inicio, setInicio] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [fin, setFin] = useState(today.toISOString().slice(0, 10));
  const reporte = useQuery({ queryKey: ["reporte-vendedores", inicio, fin], queryFn: async () => (await api.get<Row[]>("/reportes/ventas/por-vendedor", { params: { fecha_inicio: inicio, fecha_fin: fin } })).data, enabled: Boolean(inicio && fin) });
  const total = (reporte.data ?? []).reduce((sum, row) => sum + Number(row.total_vendido), 0);
  const facturas = (reporte.data ?? []).reduce((sum, row) => sum + row.facturas_emitidas, 0);
  const columns: Column<Row>[] = [{ key: "vendedor", header: "Vendedor", cell: (row) => row.vendedor, sortable: true, sortAccessor: (row) => row.vendedor }, { key: "facturas", header: "Facturas emitidas", cell: (row) => row.facturas_emitidas, align: "right" }, { key: "total", header: "Total vendido", cell: (row) => money(row.total_vendido), align: "right", sortable: true, sortAccessor: (row) => Number(row.total_vendido) }];
  return <div><PageHeader title="Ventas por vendedor" description="Consulta el rendimiento de ventas por usuario" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium">Desde<Input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Hasta<Input type="date" value={fin} onChange={(event) => setFin(event.target.value)} /></label><div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm"><span className="text-muted-foreground">Facturas</span><strong className="ml-3">{facturas}</strong><span className="ml-4 text-muted-foreground">Total</span><strong className="ml-3">{money(total)}</strong></div></div><DataTable columns={columns} data={reporte.data ?? []} rowKey={(row) => row.usuario_id || row.vendedor} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading="Sin ventas en el período" emptyDescription="Selecciona otro rango para consultar vendedores." /></div>;
}
