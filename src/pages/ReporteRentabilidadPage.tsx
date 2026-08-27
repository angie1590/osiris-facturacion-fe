import { useMemo, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { getClientes, getPersonas, type Cliente, type Persona } from "@/features/personas/api";
import api from "@/lib/api";

type Row = { cliente_id: string | null; total_vendido: string; costo_historico_total: string; utilidad_bruta_dolares: string; margen_porcentual: string; total_facturas: number };
const money = (value: string | number) => `$ ${Number(value).toFixed(2)}`;

export default function ReporteRentabilidadPage() {
  const today = new Date();
  const [inicio, setInicio] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [fin, setFin] = useState(today.toISOString().slice(0, 10));
  const reporte = useQuery({ queryKey: ["reporte-rentabilidad", inicio, fin], queryFn: async () => (await api.get<Row[]>("/reportes/rentabilidad/por-cliente", { params: { fecha_inicio: inicio, fecha_fin: fin } })).data, enabled: Boolean(inicio && fin) });
  const clientes = useQuery({ queryKey: ["rentabilidad-clientes"], queryFn: getClientes });
  const personas = useQuery({ queryKey: ["rentabilidad-personas"], queryFn: () => getPersonas(0, 1000) });
  const labels = useMemo(() => { const people = new Map((personas.data?.items ?? []).map((persona: Persona) => [persona.id, `${persona.nombre} ${persona.apellido}`.trim()])); return new Map((clientes.data ?? []).map((client: Cliente) => [client.id, people.get(client.persona_id) || client.persona_id])); }, [clientes.data, personas.data]);
  const columns: Column<Row>[] = [{ key: "cliente", header: "Cliente", cell: (row) => row.cliente_id ? labels.get(row.cliente_id) || row.cliente_id : "Consumidor final" }, { key: "facturas", header: "Facturas", cell: (row) => row.total_facturas, align: "right" }, { key: "ventas", header: "Vendido", cell: (row) => money(row.total_vendido), align: "right" }, { key: "costo", header: "Costo histórico", cell: (row) => money(row.costo_historico_total), align: "right" }, { key: "utilidad", header: "Utilidad", cell: (row) => money(row.utilidad_bruta_dolares), align: "right" }, { key: "margen", header: "Margen", cell: (row) => `${Number(row.margen_porcentual).toFixed(2)} %`, align: "right" }];
  const utility = (reporte.data ?? []).reduce((sum, row) => sum + Number(row.utilidad_bruta_dolares), 0);
  return <div><PageHeader title="Rentabilidad por cliente" description="Compara ventas, costos históricos y utilidad bruta por período" actions={<Button variant="outline" onClick={() => reporte.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-5 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium">Desde<Input type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Hasta<Input type="date" value={fin} onChange={(event) => setFin(event.target.value)} /></label><div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm"><span className="text-muted-foreground">Utilidad bruta</span><strong className="ml-3">{money(utility)}</strong></div></div><DataTable columns={columns} data={reporte.data ?? []} rowKey={(row) => row.cliente_id || "consumidor-final"} isLoading={reporte.isLoading} isError={reporte.isError} onRetry={reporte.refetch} emptyHeading="Sin ventas en el período" emptyDescription="Selecciona otro rango para consultar rentabilidad." /></div>;
}
