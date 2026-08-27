import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import api from "@/lib/api";

type FormaPago = { forma_pago_sri: string; monto: string };
type Reporte = { fecha: string; dinero_liquido: { total: string; por_forma_pago: FormaPago[] }; credito_tributario: { total_retenciones: string } };
const money = (value: string | number) => `$ ${Number(value).toFixed(2)}`;

export default function ReporteCajaPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const reporte = useQuery({ queryKey: ["reporte-caja", fecha], queryFn: async () => (await api.get<Reporte>("/reportes/caja/cierre-diario", { params: { fecha } })).data, enabled: Boolean(fecha) });
  return <div><PageHeader title="Cierre diario de caja" description="Consulta cobros y retenciones aplicadas por fecha" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 flex items-end gap-3"><label className="grid gap-1 text-sm font-medium">Fecha<Input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} /></label></div>{reporte.data && <><div className="mb-5 grid gap-4 md:grid-cols-2"><div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Dinero líquido</div><div className="mt-1 text-2xl font-semibold">{money(reporte.data.dinero_liquido.total)}</div></div><div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Retenciones recibidas aplicadas</div><div className="mt-1 text-2xl font-semibold">{money(reporte.data.credito_tributario.total_retenciones)}</div></div></div><div className="rounded-lg border p-4"><h2 className="mb-3 font-semibold">Cobros por forma de pago</h2>{reporte.data.dinero_liquido.por_forma_pago.length ? reporte.data.dinero_liquido.por_forma_pago.map((item) => <div className="flex justify-between border-b py-2 text-sm last:border-0" key={item.forma_pago_sri}><span>{item.forma_pago_sri}</span><strong>{money(item.monto)}</strong></div>) : <p className="text-sm text-muted-foreground">No hay cobros registrados para esta fecha.</p>}</div></>}{reporte.isLoading && <p className="text-sm text-muted-foreground">Cargando cierre...</p>}{reporte.isError && <p className="text-sm text-destructive">No se pudo cargar el cierre de caja.</p>}</div>;
}
