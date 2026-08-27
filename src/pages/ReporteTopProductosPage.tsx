import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";

type Row = { producto_id: string; nombre_producto: string; cantidad_vendida: string; total_dolares_vendido: string; ganancia_bruta_estimada: string };
const money = (value: string | number) => `$ ${Number(value).toFixed(2)}`;

export default function ReporteTopProductosPage() {
  const today = new Date();
  const [inicio, setInicio] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [fin, setFin] = useState(today.toISOString().slice(0, 10));
  const [limite, setLimite] = useState("10");
  const reporte = useQuery({ queryKey: ["reporte-top-productos", inicio, fin, limite], queryFn: async () => (await api.get<Row[]>("/reportes/ventas/top-productos", { params: { fecha_inicio: inicio, fecha_fin: fin, limite: Number(limite) } })).data, enabled: Boolean(inicio && fin && Number(limite) >= 1) });
  const columns: Column<Row>[] = [{ key: "producto", header: "Producto", cell: (row) => row.nombre_producto }, { key: "cantidad", header: "Cantidad", cell: (row) => Number(row.cantidad_vendida).toFixed(4), align: "right" }, { key: "ventas", header: "Ventas", cell: (row) => money(row.total_dolares_vendido), align: "right" }, { key: "ganancia", header: "Ganancia estimada", cell: (row) => money(row.ganancia_bruta_estimada), align: "right" }];
  return <div><PageHeader title="Top productos vendidos" description="Productos con mayor volumen y ganancia estimada" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium">Desde<Input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Hasta<Input type="date" value={fin} onChange={(event) => setFin(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Límite<Input type="number" min="1" max="100" value={limite} onChange={(event) => setLimite(event.target.value)} /></label></div><DataTable columns={columns} data={reporte.data ?? []} rowKey={(row) => row.producto_id} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading="Sin productos vendidos" emptyDescription="Selecciona otro período para consultar el ranking." /></div>;
}
