import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { getClientes, getPersonas, type Cliente, type Persona } from "@/features/personas/api";
import api from "@/lib/api";

type Row = { cliente_id: string; saldo_pendiente: string };
const money = (value: string | number) => `$ ${Number(value).toFixed(2)}`;

export default function ReporteCarteraCobrarPage() {
  const reporte = useQuery({ queryKey: ["reporte-cartera-cobrar"], queryFn: async () => (await api.get<Row[]>("/reportes/cartera/cobrar")).data });
  const clientes = useQuery({ queryKey: ["reporte-clientes"], queryFn: getClientes });
  const personas = useQuery({ queryKey: ["reporte-personas"], queryFn: () => getPersonas(0, 1000) });
  const labels = useMemo(() => { const people = new Map((personas.data?.items ?? []).map((persona: Persona) => [persona.id, `${persona.nombre} ${persona.apellido}`.trim()])); return new Map((clientes.data ?? []).map((client: Cliente) => [client.id, people.get(client.persona_id) || client.persona_id])); }, [clientes.data, personas.data]);
  const total = (reporte.data ?? []).reduce((sum, row) => sum + Number(row.saldo_pendiente), 0);
  const columns: Column<Row>[] = [{ key: "cliente", header: "Cliente", cell: (row) => labels.get(row.cliente_id) || row.cliente_id }, { key: "saldo", header: "Saldo pendiente", cell: (row) => money(row.saldo_pendiente), align: "right" }];
  return <div><PageHeader title="Cartera por cobrar" description="Consulta saldos pendientes agrupados por cliente" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 rounded-lg border bg-muted/30 px-4 py-3 text-sm"><span className="text-muted-foreground">Saldo total pendiente</span><strong className="ml-3 text-lg">{money(total)}</strong></div><DataTable columns={columns} data={reporte.data ?? []} rowKey={(row) => row.cliente_id} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading="No hay saldos pendientes" emptyDescription="Las cuentas por cobrar pendientes aparecerán aquí." /></div>;
}
