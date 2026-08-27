import { useState } from "react";
import { Download, Play, RefreshCw } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";
import { downloadBlob } from "@/lib/download";

type TipoDocumento = "FACTURA" | "RETENCION";
type Documento = { id: string; tipo_documento: TipoDocumento; referencia_id: string | null; clave_acceso: string | null; estado_sri: string; intentos: number; next_retry_at: string | null; mensajes_sri: string | null; creado_en: string | null };

export default function DocumentosSRIPage() {
  const [tipo, setTipo] = useState<TipoDocumento>("FACTURA");
  const cola = useQuery({ queryKey: ["cola-sri", tipo], queryFn: async () => (await api.get<{ items: Documento[] }>("/fe/cola", { params: { limit: 500, offset: 0, tipo_documento: tipo, incluir_no_vencidos: true } })).data.items });
  const processAll = useMutation({ mutationFn: async () => (await api.post("/fe/procesar-manual", { procesar_todos: true, incluir_no_vencidos: true, tipo_documento: tipo })).data, onSuccess: () => cola.refetch() });
  const processOne = useMutation({ mutationFn: (id: string) => api.post(`/fe/procesar/${id}`), onSuccess: () => cola.refetch() });
  const download = async (id: string, kind: "xml" | "ride") => { const response = await api.get(`/documentos/${id}/${kind}`, { responseType: "blob" }); downloadBlob(response, `documento-${id}.${kind === "xml" ? "xml" : "html"}`); };
  const columns: Column<Documento>[] = [
    { key: "tipo", header: "Tipo", cell: (row) => row.tipo_documento },
    { key: "clave", header: "Clave de acceso", cell: (row) => row.clave_acceso || "Pendiente" },
    { key: "estado", header: "Estado SRI", cell: (row) => row.estado_sri },
    { key: "intentos", header: "Intentos", cell: (row) => row.intentos, align: "right" },
    { key: "fecha", header: "Creado", cell: (row) => row.creado_en ? new Date(row.creado_en).toLocaleString("es-EC") : "-" },
    { key: "mensaje", header: "Mensaje", cell: (row) => row.mensajes_sri || "-" },
    { key: "acciones", header: "Acciones", cell: (row) => <div className="flex gap-1"><Button size="icon" variant="ghost" title="Procesar documento" onClick={() => processOne.mutate(row.id)} disabled={processOne.isPending}><Play className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Descargar XML" onClick={() => download(row.id, "xml")}><Download className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Abrir RIDE" onClick={() => download(row.id, "ride")}><Download className="h-4 w-4 text-muted-foreground" /></Button></div> },
  ];
  return <div><PageHeader title="Documentos electrónicos SRI" description="Monitorea la cola, reintenta documentos y descarga comprobantes autorizados" actions={<div className="flex gap-2"><Button variant="outline" onClick={() => cola.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button><Button onClick={() => processAll.mutate()} disabled={processAll.isPending}><Play className="mr-2 h-4 w-4" />Procesar cola</Button></div>} /><div className="mb-4 flex gap-2"><Button variant={tipo === "FACTURA" ? "default" : "outline"} onClick={() => setTipo("FACTURA")}>Facturas</Button><Button variant={tipo === "RETENCION" ? "default" : "outline"} onClick={() => setTipo("RETENCION")}>Retenciones</Button></div><DataTable columns={columns} data={cola.data ?? []} rowKey={(row) => row.id} isLoading={cola.isLoading} isError={cola.isError} onRetry={cola.refetch} emptyHeading="No hay documentos en cola" emptyDescription="Los documentos pendientes de procesamiento aparecerán aquí." /></div>;
}
