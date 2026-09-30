import { useState } from "react";
import { FileCheck, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import {
  useCompras,
  useCreateRetencion,
  useRetencionSugerida,
} from "@/features/compras/hooks";
import type { CompraListItem } from "@/features/compras/api";

type RetencionLinea = { codigo_retencion_sri: string; tipo: "RENTA" | "IVA"; porcentaje: string; base_calculo: string };

export default function RetencionesPage() {
  const [searchParams] = useSearchParams();
  const initialCompraId = searchParams.get("compra") ?? "";
  const [open, setOpen] = useState(Boolean(initialCompraId));
  const [compraId, setCompraId] = useState(initialCompraId);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<RetencionLinea[]>([]);
  const compras = useCompras(true);
  const suggestion = useRetencionSugerida(compraId);
  const create = useCreateRetencion();
  const selected = compras.data?.find((compra) => compra.id === compraId);
  const total = lines.reduce((sum, line) => sum + Number(line.base_calculo || 0) * Number(line.porcentaje || 0) / 100, 0);
  const columns: Column<CompraListItem>[] = [{ key: "factura", header: "Factura", cell: (row) => row.secuencial_factura }, { key: "proveedor", header: "Proveedor", cell: (row) => row.identificacion_proveedor }, { key: "fecha", header: "Fecha", cell: (row) => row.fecha_emision }, { key: "total", header: "Total", cell: (row) => `$ ${Number(row.valor_total).toFixed(2)}` }, { key: "acciones", header: "Acciones", cell: (row) => <Button size="sm" onClick={() => { setCompraId(row.id); setLines([]); setOpen(true); }}>Retener</Button> }];
  const loadSuggestion = () => { if (suggestion.data) setLines(suggestion.data.detalles.map((line) => ({ ...line }))); };
  const updateLine = (index: number, field: keyof RetencionLinea, value: string) => setLines(lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  return <div><PageHeader title="Retenciones emitidas" description="Sugiere, ajusta y registra retenciones asociadas a compras" actions={<Button onClick={() => compras.refetch()}><FileCheck className="mr-2 h-4 w-4" />Actualizar</Button>} /><DataTable columns={columns} data={compras.data ?? []} rowKey={(row) => row.id} isLoading={compras.isLoading} isError={compras.isError} onRetry={compras.refetch} emptyHeading="No hay compras disponibles" emptyDescription="Registra una compra antes de emitir una retención." />{open && <DetailModal open={open} onClose={() => setOpen(false)} title="Retención emitida" subtitle={selected ? `Compra ${selected.secuencial_factura} · Proveedor ${selected.identificacion_proveedor}` : "Selecciona una compra"} footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => create.mutate({ compraId, input: { fecha_emision: fecha, usuario_auditoria: "frontend", detalles: lines.map((line) => ({ codigo_retencion_sri: line.codigo_retencion_sri, tipo: line.tipo, porcentaje: Number(line.porcentaje), base_calculo: Number(line.base_calculo) })) } }, { onSuccess: () => { setOpen(false); setCompraId(""); setLines([]); } })} disabled={create.isPending || !lines.length || lines.some((line) => !line.codigo_retencion_sri || Number(line.porcentaje) <= 0 || Number(line.base_calculo) < 0)}>{create.isPending ? "Registrando..." : "Registrar y encolar"}</Button></div>}><div className="space-y-4"><FormField label="Fecha de emisión" required><Input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} /></FormField><div className="flex items-center justify-between"><h3 className="font-medium">Detalles sugeridos</h3><Button type="button" size="sm" variant="outline" onClick={loadSuggestion} disabled={suggestion.isLoading || !suggestion.data}>{suggestion.isLoading ? "Calculando..." : "Usar sugerencia"}</Button></div>{suggestion.isError && <p className="text-sm text-destructive">No existe una plantilla de retención para esta compra.</p>}{lines.map((line, index) => <div className="grid items-end gap-2 md:grid-cols-[100px_100px_1fr_1fr_auto]" key={`${line.codigo_retencion_sri}-${index}`}><FormField label={index === 0 ? "Código SRI" : undefined} required><Input value={line.codigo_retencion_sri} onChange={(event) => updateLine(index, "codigo_retencion_sri", event.target.value)} /></FormField><FormField label={index === 0 ? "Tipo" : undefined} required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={line.tipo} onChange={(event) => updateLine(index, "tipo", event.target.value)}><option>RENTA</option><option>IVA</option></select></FormField><FormField label={index === 0 ? "Porcentaje" : undefined} required><Input type="number" min="0.01" step="0.01" value={line.porcentaje} onChange={(event) => updateLine(index, "porcentaje", event.target.value)} /></FormField><FormField label={index === 0 ? "Base cálculo" : undefined} required><Input type="number" min="0" step="0.01" value={line.base_calculo} onChange={(event) => updateLine(index, "base_calculo", event.target.value)} /></FormField><Button type="button" size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, lineIndex) => lineIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}<Button type="button" variant="outline" onClick={() => setLines([...lines, { codigo_retencion_sri: "", tipo: "RENTA", porcentaje: "0", base_calculo: "0" }])}><Plus className="mr-2 h-4 w-4" />Añadir detalle</Button><div className="border-t pt-3 text-right font-medium">Total retenido: $ {total.toFixed(2)}</div></div></DetailModal>}</div>;
}
