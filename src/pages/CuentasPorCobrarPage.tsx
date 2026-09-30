import { useEffect, useState } from "react";
import { CreditCard, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  useCreatePagoCuentaPorCobrar,
  useCuentasPorCobrar,
} from "@/features/ventas/hooks";
import type { CuentaPorCobrar } from "@/features/ventas/api";
import { getApiErrorMessage } from "@/lib/api-error";

const today = () => new Date().toISOString().slice(0, 10);

export default function CuentasPorCobrarPage() {
  const [searchParams] = useSearchParams();
  const requestedVentaId = searchParams.get("venta");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CuentaPorCobrar | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payment, setPayment] = useState({
    monto: "",
    fecha: today(),
    forma_pago_sri: "EFECTIVO",
  });
  const accounts = useCuentasPorCobrar(search);
  const createPayment = useCreatePagoCuentaPorCobrar();

  useEffect(() => {
    if (!requestedVentaId || selected) return;
    const requestedAccount = accounts.data?.find(
      (account) => account.venta_id === requestedVentaId,
    );
    if (requestedAccount) setSelected(requestedAccount);
  }, [accounts.data, requestedVentaId, selected]);

  const columns: Column<CuentaPorCobrar>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (row) => row.cliente,
      sortable: true,
      sortAccessor: (row) => row.cliente,
    },
    {
      key: "factura",
      header: "Factura",
      cell: (row) => row.numero_factura || "Borrador",
    },
    { key: "fecha", header: "Fecha", cell: (row) => row.fecha_emision },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (row) => `$ ${Number(row.valor_total_factura).toFixed(2)}`,
    },
    {
      key: "saldo",
      header: "Saldo",
      align: "right",
      cell: (row) => `$ ${Number(row.saldo_pendiente).toFixed(2)}`,
    },
    { key: "estado", header: "Estado", cell: (row) => row.estado },
    {
      key: "acciones",
      header: "Acciones",
      cell: (row) => (
        <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
          Ver cuenta
        </Button>
      ),
    },
  ];

  const submitPayment = () => {
    if (!selected) return;
    createPayment.mutate(
      {
        ventaId: selected.venta_id,
        input: {
          monto: Number(payment.monto),
          fecha: payment.fecha,
          forma_pago_sri: payment.forma_pago_sri,
          usuario_auditoria: "frontend",
        },
      },
      {
        onSuccess: () => {
          setPaymentOpen(false);
          setSelected(null);
          setPayment({ monto: "", fecha: today(), forma_pago_sri: "EFECTIVO" });
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        title="Cuentas por cobrar"
        description="Controla saldos de clientes y registra cobros"
        actions={
          <Button onClick={() => accounts.refetch()}>
            <CreditCard className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        }
      />
      <div className="mb-4 max-w-sm">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar cliente o factura"
        />
      </div>
      <DataTable
        columns={columns}
        data={accounts.data ?? []}
        rowKey={(row) => row.id}
        isLoading={accounts.isLoading}
        isError={accounts.isError}
        onRetry={accounts.refetch}
        emptyHeading="No hay cuentas por cobrar"
        emptyDescription="Las ventas a crédito aparecerán aquí."
      />
      {selected && (
        <DetailModal
          open
          onClose={() => setSelected(null)}
          title={`Cuenta ${selected.numero_factura || selected.venta_id}`}
          sections={[
            {
              fields: [
                { label: "Cliente", value: selected.cliente },
                { label: "Fecha", value: selected.fecha_emision },
                { label: "Total factura", value: `$ ${selected.valor_total_factura}` },
                { label: "Retenido", value: `$ ${selected.valor_retenido}` },
                { label: "Cobros acumulados", value: `$ ${selected.pagos_acumulados}` },
                { label: "Saldo pendiente", value: `$ ${selected.saldo_pendiente}` },
              ],
            },
          ]}
          footer={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
              <Button
                onClick={() => setPaymentOpen(true)}
                disabled={Number(selected.saldo_pendiente) <= 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar cobro
              </Button>
            </div>
          }
        />
      )}
      {selected && paymentOpen && (
        <DetailModal
          open
          onClose={() => setPaymentOpen(false)}
          title="Registrar cobro"
          subtitle="El cobro se aplicará a la cuenta seleccionada."
          footer={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPaymentOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={submitPayment}
                disabled={
                  createPayment.isPending ||
                  Number(payment.monto) <= 0 ||
                  Number(payment.monto) > Number(selected.saldo_pendiente)
                }
              >
                {createPayment.isPending ? "Guardando..." : "Guardar cobro"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {createPayment.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {getApiErrorMessage(
                    createPayment.error,
                    "No se pudo registrar el cobro.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            <FormField label="Monto" required>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={payment.monto}
                onChange={(event) =>
                  setPayment({ ...payment, monto: event.target.value })
                }
              />
            </FormField>
            <FormField label="Fecha" required>
              <Input
                type="date"
                value={payment.fecha}
                onChange={(event) =>
                  setPayment({ ...payment, fecha: event.target.value })
                }
              />
            </FormField>
            <FormField label="Forma de pago" required>
              <select
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                value={payment.forma_pago_sri}
                onChange={(event) =>
                  setPayment({ ...payment, forma_pago_sri: event.target.value })
                }
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </FormField>
          </div>
        </DetailModal>
      )}
    </div>
  );
}