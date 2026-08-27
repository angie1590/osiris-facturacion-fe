import { useState } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { getProductos, type ProductoListado } from "@/features/productos/api";
import api from "@/lib/api";

type Movimiento = { fecha: string; tipo_movimiento: string; cantidad: string; costo_unitario: string; saldo_cantidad: string };
type Reporte = { producto_id: string; fecha_inicio: string; fecha_fin: string; movimientos: Movimiento[] };
const money = (value: string | number) => `$ ${Number(value).toFixed(4)}`;

export default function ReporteKardexPage() {
  const today = new Date();
  const [productoId, setProductoId] = useState("");
  const [inicio, setInicio] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [fin, setFin] = useState(today.toISOString().slice(0, 10));
  const productos = useQuery({ queryKey: ["productos-kardex"], queryFn: () => getProductos(0, 1000) });
  const reporte = useQuery({ queryKey: ["reporte-kardex", productoId, inicio, fin], queryFn: async () => (await api.get<Reporte>(`/reportes/inventario/kardex/${productoId}`, { params: { fecha_inicio: inicio, fecha_fin: fin } })).data, enabled: Boolean(productoId && inicio && fin) });
  const selected = productos.data?.items.find((product: ProductoListado) => product.id === productoId);
  const columns: Column<Movimiento>[] = [{ key: "fecha", header: "Fecha", cell: (row) => row.fecha }, { key: "tipo", header: "Movimiento", cell: (row) => row.tipo_movimiento }, { key: "cantidad", header: "Cantidad", cell: (row) => Number(row.cantidad).toFixed(4), align: "right" }, { key: "costo", header: "Costo unitario", cell: (row) => money(row.costo_unitario), align: "right" }, { key: "saldo", header: "Saldo", cell: (row) => Number(row.saldo_cantidad).toFixed(4), align: "right" }];
  return <div><PageHeader title="Kárdex de inventario" description="Consulta movimientos y saldo acumulado por producto" actions={<Button variant="outline" onClick={() => reporte.refetch()} disabled={!productoId}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 flex flex-wrap items-end gap-3"><label className="grid min-w-64 gap-1 text-sm font-medium">Producto<select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={productoId} onChange={(event) => setProductoId(event.target.value)}><option value="">Seleccionar producto</option>{(productos.data?.items ?? []).map((product: ProductoListado) => <option key={product.id} value={product.id}>{product.nombre}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Desde<Input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Hasta<Input type="date" value={fin} onChange={(event) => setFin(event.target.value)} /></label></div>{selected && <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" />{selected.nombre}</div>}<DataTable columns={columns} data={reporte.data?.movimientos ?? []} rowKey={(row, index) => `${row.fecha}-${index}`} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading={productoId ? "Sin movimientos en el período" : "Selecciona un producto"} emptyDescription={productoId ? "Prueba con otro rango de fechas." : "Elige un producto para consultar su kárdex."} /></div>;
}
