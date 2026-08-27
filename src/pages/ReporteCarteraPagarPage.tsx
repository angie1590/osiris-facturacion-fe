import { useMemo } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";
import { getProveedoresPersona, getProveedoresSociedad, type ProveedorPersona, type ProveedorSociedad } from "@/features/personas/api";

type Row = { proveedor_id: string; saldo_pendiente: string };

export default function ReporteCarteraPagarPage() {
  const reporte = useQuery({ queryKey: ["reporte-cartera-pagar"], queryFn: async () => (await api.get<Row[]>("/reportes/cartera/pagar")).data });
  const personas = useQuery({ queryKey: ["reporte-proveedores-persona"], queryFn: getProveedoresPersona });
  const sociedades = useQuery({ queryKey: ["reporte-proveedores-sociedad"], queryFn: getProveedoresSociedad });
  const names = useMemo(() => new Map<string, string>([...(personas.data ?? []).map((provider: ProveedorPersona) => [provider.id, provider.nombre_comercial || provider.persona_id]), ...(sociedades.data ?? []).map((provider: ProveedorSociedad) => [provider.id, provider.razon_social])]), [personas.data, sociedades.data]);
  const total = (reporte.data ?? []).reduce((sum, row) => sum + Number(row.saldo_pendiente), 0);
  const columns: Column<Row>[] = [{ key: "proveedor", header: "Proveedor", cell: (row) => names.get(row.proveedor_id) || row.proveedor_id }, { key: "saldo", header: "Saldo pendiente", cell: (row) => `$ ${Number(row.saldo_pendiente).toFixed(2)}`, align: "right" }];
  return <div><PageHeader title="Cartera por pagar" description="Consulta obligaciones pendientes agrupadas por proveedor" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 rounded-lg border bg-muted/30 px-4 py-3 text-sm"><span className="text-muted-foreground">Saldo total pendiente</span><strong className="ml-3 text-lg">$ {total.toFixed(2)}</strong></div><DataTable columns={columns} data={reporte.data ?? []} rowKey={(row) => row.proveedor_id} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading="No hay saldos pendientes" emptyDescription="Las cuentas por pagar pendientes aparecerán aquí." /></div>;
}
