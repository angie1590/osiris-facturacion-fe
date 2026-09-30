import { useState } from "react";
import { CreditCard, Eye, FileDown, Plus, Trash2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import {
  useCancelVenta,
  useCreateVenta,
  useEmitVenta,
  useVenta,
  useVentas,
} from "@/features/ventas/hooks";
import {
  downloadVentaDocument,
  getVenta,
  type Venta,
  type VentaListItem,
} from "@/features/ventas/api";

type Producto = { id: string; nombre: string; pvp: string };
type Cliente = { id: string; persona_id: string };
type Persona = { id: string; nombre: string; apellido: string; identificacion: string; tipo_identificacion: string };
type Punto = { id: string; codigo: string; descripcion: string; sucursal_id: string };
type Bodega = { id: string; codigo_bodega: string; nombre_bodega: string };

export default function VentasPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selected, setSelected] = useState<Venta | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [form, setForm] = useState({ cliente_id: "", tipo_identificacion: "CEDULA", identificacion: "", forma_pago: "EFECTIVO", punto_emision_id: "", bodega_id: "" });
  const [lines, setLines] = useState([{ producto_id: "", cantidad: "1" }]);
  const ventas = useVentas();
  const detail = useVenta(selected?.id);
  const productos = useQuery({ queryKey: ["productos"], queryFn: async () => (await api.get<{ items: Producto[] }>("/productos", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const clientes = useQuery({ queryKey: ["clientes"], queryFn: async () => (await api.get<{ items: Cliente[] }>("/clientes", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const personas = useQuery({ queryKey: ["personas"], queryFn: async () => (await api.get<{ items: Persona[] }>("/personas", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const puntos = useQuery({ queryKey: ["puntos-canonicos"], queryFn: async () => (await api.get<{ items: Punto[] }>("/puntos-emision", { params: { limit: 1000, offset: 0, only_active: true } })).data.items });
  const bodegas = useQuery({ queryKey: ["bodegas-canonicas"], queryFn: async () => (await api.get<Bodega[]>("/bodegas", { params: { limit: 200, skip: 0 } })).data });
  const createMutation = useCreateVenta();
  const create = {
    isPending: createMutation.isPending,
    mutate: () =>
      createMutation.mutate(
        {
          cliente_id: form.cliente_id || undefined,
          punto_emision_id: form.punto_emision_id || undefined,
          bodega_id: form.bodega_id || undefined,
          tipo_identificacion_comprador: form.tipo_identificacion,
          identificacion_comprador: form.identificacion,
          forma_pago: form.forma_pago,
          usuario_auditoria: "frontend",
          detalles: lines.map((line) => {
            const product = productos.data?.find(
              (item) => item.id === line.producto_id,
            );
            return {
              producto_id: line.producto_id,
              descripcion: product?.nombre || "Producto",
              cantidad: Number(line.cantidad),
              precio_unitario: Number(product?.pvp || 0),
            };
          }),
        },
        {
          onSuccess: () => {
            setOpen(false);
            setLines([{ producto_id: "", cantidad: "1" }]);
          },
        },
      ),
  };
  const emit = useEmitVenta();
  const loadDetail = async (id: string) => { const venta = await getVenta(id); setSelected(venta); setDetailOpen(true); };
  const cancelMutation = useCancelVenta();
  const cancel = {
    isPending: cancelMutation.isPending,
    mutate: () =>
      cancelMutation.mutate(
        { id: selected!.id, motivo: cancelReason || undefined },
        {
          onSuccess: () => {
            setCancelOpen(false);
            setDetailOpen(false);
            setCancelReason("");
          },
        },
      ),
  };
  const download = async (id: string, kind: "xml" | "ride") => { const response = await downloadVentaDocument(id, kind); downloadBlob(response, `venta-${id}.${kind === "xml" ? "xml" : "pdf"}`); };
  const subtotal = lines.reduce((total, line) => { const product = productos.data?.find((item) => item.id === line.producto_id); return total + Number(product?.pvp || 0) * Number(line.cantidad || 0); }, 0);
  const columns: Column<VentaListItem>[] = [{ key: "numero", header: "Comprobante", cell: (row) => row.numero_factura || "Borrador" }, { key: "cliente", header: "Cliente", cell: (row) => row.cliente }, { key: "fecha", header: "Fecha", cell: (row) => row.fecha_emision }, { key: "estado", header: "Estado", cell: (row) => `${row.estado} · SRI: ${row.estado_sri}` }, { key: "total", header: "Total", cell: (row) => `$ ${Number(row.valor_total).toFixed(2)}` }, { key: "acciones", header: "Acciones", cell: (row) => <div className="flex gap-1"><Button size="icon" variant="ghost" title="Ver detalle" onClick={() => loadDetail(row.id)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Ver cuenta por cobrar" onClick={() => navigate(`/cuentas-por-cobrar?venta=${row.id}`)}><CreditCard className="h-4 w-4" /></Button>{row.estado === "BORRADOR" && <Button size="sm" onClick={() => emit.mutate(row.id)} disabled={emit.isPending}>Emitir</Button>}{row.estado !== "BORRADOR" && <><Button size="icon" variant="ghost" title="Descargar XML" onClick={() => download(row.id, "xml")}><FileDown className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Anular" onClick={() => { setSelected({ id: row.id } as Venta); setCancelOpen(true); }}><XCircle className="h-4 w-4 text-destructive" /></Button></>}</div> }];
  return <div><PageHeader title="Ventas" description="Registra ventas y prepara comprobantes electrónicos" actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva venta</Button>} /><DataTable columns={columns} data={ventas.data ?? []} rowKey={(row) => row.id} isLoading={ventas.isLoading} isError={ventas.isError} onRetry={ventas.refetch} emptyHeading="No hay ventas" emptyDescription="Las ventas registradas aparecerán aquí." />{detail.data && <DetailModal open={detailOpen} onClose={() => setDetailOpen(false)} title={`Venta ${detail.data.secuencial_formateado || detail.data.id}`} sections={[{ title: "Resumen", fields: [{ label: "Fecha", value: detail.data.fecha_emision }, { label: "Comprador", value: detail.data.identificacion_comprador }, { label: "Forma de pago", value: detail.data.forma_pago }, { label: "Estado", value: `${detail.data.estado} · SRI: ${detail.data.estado_sri}` }, { label: "Subtotal", value: `$ ${detail.data.subtotal_sin_impuestos}` }, { label: "IVA", value: `$ ${detail.data.monto_iva}` }, { label: "Total", value: `$ ${detail.data.valor_total}` }] }, { title: "Líneas", content: <div className="space-y-2">{detail.data.detalles.map((line, index) => <div key={index} className="flex justify-between text-sm"><span>{line.descripcion} × {line.cantidad}</span><span>$ {line.subtotal_sin_impuesto}</span></div>)}</div> }]} footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button><Button onClick={() => download(detail.data!.id, "xml")}>XML</Button><Button onClick={() => download(detail.data!.id, "ride")}>RIDE</Button></div>} />}{open && <DetailModal open={open} onClose={() => setOpen(false)} title="Nueva venta" subtitle="Selecciona cliente, productos y punto de emisión." footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => create.mutate()} disabled={create.isPending || lines.some((line) => !line.producto_id || Number(line.cantidad) <= 0) || !form.identificacion || !form.punto_emision_id}>{create.isPending ? "Guardando..." : "Registrar venta"}</Button></div>}><div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><FormField label="Cliente"><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.cliente_id} onChange={(event) => { const id = event.target.value; const client = clientes.data?.find((item) => item.id === id); const person = personas.data?.find((item) => item.id === client?.persona_id); setForm({ ...form, cliente_id: id, identificacion: person?.identificacion || "", tipo_identificacion: person?.tipo_identificacion || "CEDULA" }); }}>{<option value="">Consumidor final</option>}{(clientes.data ?? []).map((item) => { const person = personas.data?.find((candidate) => candidate.id === item.persona_id); return <option key={item.id} value={item.id}>{person ? `${person.nombre} ${person.apellido}` : item.id}</option>; })}</select></FormField><FormField label="Identificación comprador" required><Input value={form.identificacion} onChange={(event) => setForm({ ...form, identificacion: event.target.value })} /></FormField><FormField label="Punto de emisión" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.punto_emision_id} onChange={(event) => setForm({ ...form, punto_emision_id: event.target.value })}><option value="">Selecciona un punto</option>{(puntos.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.descripcion}</option>)}</select></FormField><FormField label="Bodega"><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.bodega_id} onChange={(event) => setForm({ ...form, bodega_id: event.target.value })}><option value="">Sin bodega</option>{(bodegas.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.codigo_bodega} · {item.nombre_bodega}</option>)}</select></FormField><FormField label="Forma de pago" required><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.forma_pago} onChange={(event) => setForm({ ...form, forma_pago: event.target.value })}><option>EFECTIVO</option><option>TARJETA</option><option>TRANSFERENCIA</option></select></FormField></div><section className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Líneas</h3><Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { producto_id: "", cantidad: "1" }])}><Plus className="mr-1 h-4 w-4" />Agregar línea</Button></div>{lines.map((line, index) => <div key={index} className="flex items-end gap-2"><FormField label="Producto" required className="min-w-0 flex-1"><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={line.producto_id} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, producto_id: event.target.value } : item))}><option value="">Selecciona un producto</option>{(productos.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre} · $ {item.pvp}</option>)}</select></FormField><FormField label="Cantidad" required><Input className="w-24" type="number" min="0.01" step="0.01" value={line.cantidad} onChange={(event) => setLines(lines.map((item, i) => i === index ? { ...item, cantidad: event.target.value } : item))} /></FormField>{lines.length > 1 && <Button type="button" size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>)}<p className="text-right text-sm font-semibold">Subtotal estimado: $ {subtotal.toFixed(2)}</p></section></div></DetailModal>}{cancelOpen && <DetailModal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Anular venta" subtitle="La anulación requiere confirmación del portal SRI." footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setCancelOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending || cancelReason.trim().length < 5}>{cancel.isPending ? "Anulando..." : "Confirmar anulación"}</Button></div>}><FormField label="Motivo" required hint="Mínimo 5 caracteres"><Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></FormField></DetailModal>}</div>;
}
