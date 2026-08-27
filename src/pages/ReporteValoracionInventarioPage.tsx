import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";

type Producto = { producto_id: string; nombre: string; cantidad_actual: string; costo_promedio: string; valor_total: string };
type Reporte = { patrimonio_total: string; productos: Producto[] };
const money = (value: string | number) => `$ ${Number(value).toFixed(2)}`;

export default function ReporteValoracionInventarioPage() {
  const reporte = useQuery({ queryKey: ["reporte-valoracion-inventario"], queryFn: async () => (await api.get<Reporte>("/reportes/inventario/valoracion")).data });
  const columns: Column<Producto>[] = [{ key: "producto", header: "Producto", cell: (row) => row.nombre, sortable: true, sortAccessor: (row) => row.nombre }, { key: "cantidad", header: "Existencia", cell: (row) => Number(row.cantidad_actual).toFixed(4), align: "right" }, { key: "costo", header: "Costo promedio", cell: (row) => money(row.costo_promedio), align: "right" }, { key: "valor", header: "Valor total", cell: (row) => money(row.valor_total), align: "right", sortable: true, sortAccessor: (row) => Number(row.valor_total) }];
  return <div><PageHeader title="Valoración de inventario" description="Consulta existencias, costos promedio y patrimonio valorizado" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 rounded-lg border bg-muted/30 px-4 py-3"><span className="text-sm text-muted-foreground">Patrimonio total</span><strong className="ml-3 text-2xl">{money(reporte.data?.patrimonio_total || 0)}</strong></div><DataTable columns={columns} data={reporte.data?.productos ?? []} rowKey={(row) => row.producto_id} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading="No hay productos valorizados" emptyDescription="Las existencias valorizadas aparecerán aquí." /></div>;
}
