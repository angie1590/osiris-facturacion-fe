import { useState } from "react";
import { CreditCard, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import api from "@/lib/api";

type Cuenta = { id: string; compra_id: string; proveedor_id: string; proveedor: string; numero_factura: string; fecha_emision: string; valor_total_factura: string; valor_retenido: string; pagos_acumulados: string; saldo_pendiente: string; estado: string };

export default function CuentasPorPagarPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Cuenta | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payment, setPayment] = useState({ monto: "", forma_pago: "EFECTIVO" });
  const query = useQuery({ queryKey: ["cxp-canonicas", search], queryFn: async () => (await api.get<{ items: Cuenta[] }>("/cxp", { params: { limit: 500, offset: 0, only_active: true, texto: search || undefined } })).data.items });
  const paymentMutation = useMutation({ mutationFn: async () => (await api.post(`/cxp/${selected!.compra_id}/pagos`, { monto: Number(payment.monto), forma_pago: payment.forma_pago, usuario_auditoria: "frontend" })).data, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cxp-canonicas"] }); setPaymentOpen(false); setSelected(null); setPayment({ monto: "", forma_pago: "EFECTIVO" }); } });
  const columns: Column<Cuenta>[] = [
    { key: "proveedor", header: "Proveedor", cell: (row) => row.proveedor, sortable: true, sortAccessor: (row) => row.proveedor },
    { key: "factura", header: "Factura", cell: (row) => row.numero_factura },
    { key: "fecha", header: "Fecha", cell: (row) => row.fecha_emision },
    { key: "total", header: "Total", cell: (row) => `$ ${Number(row.valor_total_factura).toFixed(2)}`, align: "right" },
    { key: "saldo", header: "Saldo", cell: (row) => `$ ${Number(row.saldo_pendiente).toFixed(2)}`, align: "right" },
    { key: "estado", header: "Estado", cell: (row) => row.estado },
    { key: "acciones", header: "Acciones", cell: (row) => <Button size="sm" variant="outline" onClick={() => setSelected(row)}>Ver cuenta</Button> },
  ];
  return <div><PageHeader title="Cuentas por pagar" description="Controla obligaciones con proveedores y registra pagos" actions={<Button onClick={() => query.refetch()}><CreditCard className="mr-2 h-4 w-4" />Actualizar</Button>} /><div className="mb-4 max-w-sm"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar proveedor o factura" /></div><DataTable columns={columns} data={query.data ?? []} rowKey={(row) => row.id} isLoading={query.isLoading} isError={query.isError} onRetry={query.refetch} emptyHeading="No hay cuentas por pagar" emptyDescription="Las obligaciones generadas por compras aparecerán aquí." />{selected && <DetailModal open={Boolean(selected)} onClose={() => setSelected(null)} title={`Cuenta ${selected.numero_factura}`} sections={[{ fields: [{ label: "Proveedor", value: selected.proveedor }, { label: "Fecha", value: selected.fecha_emision }, { label: "Total factura", value: `$ ${selected.valor_total_factura}` }, { label: "Retenido", value: `$ ${selected.valor_retenido}` }, { label: "Pagos acumulados", value: `$ ${selected.pagos_acumulados}` }, { label: "Saldo pendiente", value: `$ ${selected.saldo_pendiente}` }] }]} footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button><Button onClick={() => setPaymentOpen(true)} disabled={Number(selected.saldo_pendiente) <= 0}><Plus className="mr-2 h-4 w-4" />Registrar pago</Button></div>} />}{selected && <DetailModal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Registrar pago" subtitle="El pago se aplicará a la cuenta por pagar seleccionada." footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancelar</Button><Button onClick={() => paymentMutation.mutate()} disabled={paymentMutation.isPending || Number(payment.monto) <= 0 || Number(payment.monto) > Number(selected.saldo_pendiente)}>{paymentMutation.isPending ? "Guardando..." : "Guardar pago"}</Button></div>}><div className="space-y-4"><FormField label="Monto" required><Input type="number" min="0.01" step="0.01" max={selected.saldo_pendiente} value={payment.monto} onChange={(event) => setPayment({ ...payment, monto: event.target.value })} /></FormField><FormField label="Forma de pago" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={payment.forma_pago} onChange={(event) => setPayment({ ...payment, forma_pago: event.target.value })}><option>EFECTIVO</option><option>TARJETA</option><option>TRANSFERENCIA</option></select></FormField></div></DetailModal>}</div>;
}
