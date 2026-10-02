import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import api from "@/lib/api";

type Sucursal = {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  empresa_id: string;
  es_matriz: boolean;
};

type Punto = {
  id: string;
  codigo: string;
  descripcion: string;
  modalidad_emision: "FISICA" | "ELECTRONICA";
  secuencial_actual: number;
  sucursal_id: string;
};

type Empresa = { id: string; razon_social: string };
type Modalidad = Punto["modalidad_emision"];
type FormState = {
  codigo: string;
  nombre: string;
  direccion: string;
  empresa_id: string;
  sucursal_id: string;
  descripcion: string;
  modalidad_emision: Modalidad;
  secuencial_actual: string;
};

const emptyForm: FormState = {
  codigo: "",
  nombre: "",
  direccion: "",
  empresa_id: "",
  sucursal_id: "",
  descripcion: "",
  modalidad_emision: "ELECTRONICA",
  secuencial_actual: "1",
};

export default function ConfiguracionOperativaPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"sucursales" | "puntos">("sucursales");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const isSucursal = tab === "sucursales";

  const empresas = useQuery({
    queryKey: ["empresas-canonicas"],
    queryFn: async () =>
      (await api.get<{ items: Empresa[] }>("/empresas", { params: { limit: 1000, offset: 0, only_active: true } })).data.items,
  });
  const sucursales = useQuery({
    queryKey: ["sucursales-canonicas"],
    queryFn: async () =>
      (await api.get<{ items: Sucursal[] }>("/sucursales", { params: { limit: 1000, offset: 0, only_active: true } })).data.items,
  });
  const puntos = useQuery({
    queryKey: ["puntos-canonicos"],
    queryFn: async () =>
      (await api.get<{ items: Punto[] }>("/puntos-emision", { params: { limit: 1000, offset: 0, only_active: true } })).data.items,
  });
  const previews = useQuery({
    queryKey: ["puntos-secuencial-preview", puntos.data?.map((point) => point.id)],
    enabled: Boolean(puntos.data?.length),
    queryFn: async () => {
      const entries = await Promise.all(
        (puntos.data ?? []).map(async (point) => {
          const response = await api.post<{ secuencial: string }>(
            `/puntos-emision/${point.id}/secuenciales/FACTURA/siguiente`,
            {},
          );
          return [point.id, response.data.secuencial] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  const createSucursal = useMutation({
    mutationFn: () =>
      api.post("/sucursales", {
        codigo: form.codigo,
        nombre: form.nombre,
        direccion: form.direccion,
        empresa_id: form.empresa_id,
        usuario_auditoria: "frontend",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sucursales-canonicas"] });
      setOpen(false);
      setForm(emptyForm);
    },
  });
  const createPunto = useMutation({
    mutationFn: () =>
      api.post("/puntos-emision", {
        codigo: form.codigo,
        descripcion: form.descripcion,
        modalidad_emision: form.modalidad_emision,
        secuencial_actual: Number(form.secuencial_actual),
        sucursal_id: form.sucursal_id,
        usuario_auditoria: "frontend",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["puntos-canonicos"] });
      setOpen(false);
      setForm(emptyForm);
    },
  });

  const sucursalColumns: Column<Sucursal>[] = [
    { key: "codigo", header: "Código", cell: (row) => row.codigo },
    { key: "nombre", header: "Sucursal", cell: (row) => row.nombre },
    {
      key: "empresa",
      header: "Empresa",
      cell: (row) => empresas.data?.find((item) => item.id === row.empresa_id)?.razon_social || row.empresa_id,
    },
    { key: "matriz", header: "Tipo", cell: (row) => (row.es_matriz ? "Matriz" : "Sucursal") },
  ];
  const puntoColumns: Column<Punto>[] = [
    { key: "codigo", header: "Punto", cell: (row) => row.codigo },
    { key: "descripcion", header: "Descripción", cell: (row) => row.descripcion },
    {
      key: "sucursal",
      header: "Establecimiento",
      cell: (row) => {
        const branch = sucursales.data?.find((item) => item.id === row.sucursal_id);
        return branch ? `${branch.codigo} · ${branch.nombre}` : row.sucursal_id;
      },
    },
    {
      key: "modalidad",
      header: "Modalidad",
      cell: (row) => (row.modalidad_emision === "ELECTRONICA" ? "Electrónica" : "Física"),
    },
    {
      key: "secuencial",
      header: "Próximo comprobante",
      cell: (row) => {
        const branch = sucursales.data?.find((item) => item.id === row.sucursal_id);
        const next = previews.data?.[row.id];
        return branch && next ? `${branch.codigo}-${row.codigo}-${next}` : "Cargando";
      },
    },
  ];

  const canSave = isSucursal
    ? Boolean(form.codigo && form.nombre && form.empresa_id)
    : Boolean(
        /^\d{3}$/.test(form.codigo) &&
          form.descripcion &&
          form.sucursal_id &&
          Number(form.secuencial_actual) >= 1 &&
          Number(form.secuencial_actual) <= 999999999,
      );
  const save = () => (isSucursal ? createSucursal.mutate() : createPunto.mutate());
  const saving = createSucursal.isPending || createPunto.isPending;

  return (
    <div>
      <PageHeader
        title="Configuración operativa"
        description="Sucursales y series de emisión"
        actions={
          <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            {isSucursal ? "Nueva sucursal" : "Nuevo punto"}
          </Button>
        }
      />
      <div className="mb-4 flex gap-2">
        <Button variant={isSucursal ? "default" : "outline"} onClick={() => setTab("sucursales")}>Sucursales</Button>
        <Button variant={!isSucursal ? "default" : "outline"} onClick={() => setTab("puntos")}>Puntos de emisión</Button>
      </div>
      {isSucursal ? (
        <DataTable
          columns={sucursalColumns}
          data={sucursales.data ?? []}
          rowKey={(row) => row.id}
          isLoading={sucursales.isLoading}
          isError={sucursales.isError}
          onRetry={sucursales.refetch}
          emptyHeading="No hay sucursales"
          emptyDescription="Crea una sucursal para organizar la operación."
        />
      ) : (
        <DataTable
          columns={puntoColumns}
          data={puntos.data ?? []}
          rowKey={(row) => row.id}
          isLoading={puntos.isLoading}
          isError={puntos.isError}
          onRetry={puntos.refetch}
          emptyHeading="No hay puntos de emisión"
          emptyDescription="Crea un punto para generar comprobantes."
        />
      )}
      <DetailModal
        open={open}
        onClose={() => setOpen(false)}
        title={isSucursal ? "Nueva sucursal" : "Nuevo punto de emisión"}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!canSave || saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        }
      >
        {isSucursal ? (
          <div className="space-y-4">
            <FormField label="Código" required>
              <Input maxLength={3} value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value })} />
            </FormField>
            <FormField label="Nombre" required>
              <Input value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
            </FormField>
            <FormField label="Empresa" required>
              <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.empresa_id} onChange={(event) => setForm({ ...form, empresa_id: event.target.value })}>
                <option value="">Selecciona una empresa</option>
                {(empresas.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.razon_social}</option>)}
              </select>
            </FormField>
            <FormField label="Dirección" required>
              <Input value={form.direccion} onChange={(event) => setForm({ ...form, direccion: event.target.value })} />
            </FormField>
          </div>
        ) : (
          <div className="space-y-4">
            <FormField label="Código del punto" required>
              <Input inputMode="numeric" maxLength={3} value={form.codigo} onChange={(event) => setForm({ ...form, codigo: event.target.value.replace(/\D/g, "") })} />
            </FormField>
            <FormField label="Descripción" required>
              <Input value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} />
            </FormField>
            <FormField label="Sucursal" required>
              <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.sucursal_id} onChange={(event) => setForm({ ...form, sucursal_id: event.target.value })}>
                <option value="">Selecciona una sucursal</option>
                {(sucursales.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
              </select>
            </FormField>
            <FormField label="Modalidad de la serie" required>
              <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={form.modalidad_emision} onChange={(event) => setForm({ ...form, modalidad_emision: event.target.value as Modalidad })}>
                <option value="ELECTRONICA">Electrónica</option>
                <option value="FISICA">Física</option>
              </select>
            </FormField>
            <FormField label="Próximo secuencial inicial" required>
              <Input type="number" min="1" max="999999999" value={form.secuencial_actual} onChange={(event) => setForm({ ...form, secuencial_actual: event.target.value })} />
            </FormField>
            <p className="text-sm text-muted-foreground">El número se consume al emitir, no al guardar un borrador. Para cambiar de modalidad, crea otro punto con una serie autorizada.</p>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
