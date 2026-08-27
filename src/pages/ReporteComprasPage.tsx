import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";

type Row = { proveedor_id: string; razon_social: string; total_compras: string; cantidad_facturas: number };

export default function ReporteComprasPage() {
  const today = new Date();
  const [inicio, setInicio] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [fin, setFin] = useState(today.toISOString().slice(0, 10));
  const reporte = useQuery({ queryKey: ["reporte-compras", inicio, fin], queryFn: async () => (await api.get<Row[]>("/reportes/compras/por-proveedor", { params: { fecha_inicio: inicio, fecha_fin: fin } })).data, enabled: Boolean(inicio && fin) });
  const total = (reporte.data ?? []).reduce((sum, row) => sum + Number(row.total_compras), 0);
  const columns: Column<Row>[] = [{ key: "proveedor", header: "Proveedor", cell: (row) => row.razon_social }, { key: "facturas", header: "Facturas", cell: (row) => row.cantidad_facturas, align: "right" }, { key: "total", header: "Total compras", cell: (row) => `$ ${Number(row.total_compras).toFixed(2)}`, align: "right" }];
  return <div><PageHeader title="Reporte de compras" description="Consolida compras por proveedor en un rango fiscal" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium">Desde<Input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Hasta<Input type="date" value={fin} onChange={(event) => setFin(event.target.value)} /></label><div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm"><span className="text-muted-foreground">Total compras</span><strong className="ml-3">$ {total.toFixed(2)}</strong></div></div><DataTable columns={columns} data={reporte.data ?? []} rowKey={(row) => row.proveedor_id} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading="Sin compras en el período" emptyDescription="Selecciona otro rango o registra compras nuevas." /></div>;
}
