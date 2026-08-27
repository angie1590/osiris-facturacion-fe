import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";

type Retencion = { id: string; compra_id: string; numero_factura: string; proveedor: string; fecha_emision: string; estado: string; estado_sri: string; total_retenido: string };

export default function RetencionesHistorialPage() {
  const [texto, setTexto] = useState("");
  const retenciones = useQuery({ queryKey: ["retenciones-historial", texto], queryFn: async () => (await api.get<{ items: Retencion[] }>("/retenciones", { params: { limit: 500, offset: 0, texto: texto || undefined } })).data.items });
  const columns: Column<Retencion>[] = [
    { key: "factura", header: "Factura", cell: (row) => row.numero_factura },
    { key: "proveedor", header: "Proveedor", cell: (row) => row.proveedor },
    { key: "fecha", header: "Fecha", cell: (row) => row.fecha_emision },
    { key: "total", header: "Total retenido", cell: (row) => `$ ${Number(row.total_retenido).toFixed(2)}`, align: "right" },
    { key: "estado", header: "Estado", cell: (row) => row.estado },
    { key: "sri", header: "Estado SRI", cell: (row) => row.estado_sri },
  ];
  return <div><PageHeader title="Historial de retenciones" description="Consulta retenciones registradas y su estado ante el SRI" actions={<Button variant="outline" onClick={() => retenciones.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-4 max-w-sm"><Input value={texto} onChange={(event) => setTexto(event.target.value)} placeholder="Buscar factura o proveedor" /></div><DataTable columns={columns} data={retenciones.data ?? []} rowKey={(row) => row.id} isLoading={retenciones.isLoading} isError={retenciones.isError} onRetry={retenciones.refetch} emptyHeading="No hay retenciones registradas" emptyDescription="Las retenciones creadas desde una compra aparecerán aquí." /></div>;
}
