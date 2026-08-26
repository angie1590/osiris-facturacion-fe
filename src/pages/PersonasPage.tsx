import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { useCreatePersona, usePersonas } from "@/features/personas/hooks";
import type { Persona, TipoIdentificacion } from "@/features/personas/api";

const initialForm = {
  identificacion: "",
  tipo_identificacion: "CEDULA" as TipoIdentificacion,
  nombre: "",
  apellido: "",
  direccion: "",
  telefono: "",
  ciudad: "",
  email: "",
};

export default function PersonasPage() {
  const { data, isLoading, isError, refetch } = usePersonas();
  const create = useCreatePersona();
  const [form, setForm] = useState(initialForm);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Persona | null>(null);
  const [search, setSearch] = useState("");

  const personas = (data?.items ?? []).filter((persona) =>
    `${persona.nombre} ${persona.apellido} ${persona.identificacion}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const setField = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleCreate = async () => {
    if (!form.identificacion || !form.nombre || !form.apellido) return;
    await create.mutateAsync({
      ...form,
      direccion: form.direccion || undefined,
      telefono: form.telefono || undefined,
      ciudad: form.ciudad || undefined,
      email: form.email || undefined,
      usuario_auditoria: "frontend",
    });
    setForm(initialForm);
    setOpen(false);
  };

  const columns: Column<Persona>[] = [
    { key: "identificacion", header: "Identificación", cell: (row) => row.identificacion },
    { key: "nombre", header: "Nombre", cell: (row) => `${row.nombre} ${row.apellido}` },
    { key: "telefono", header: "Teléfono", cell: (row) => row.telefono || "—" },
    { key: "email", header: "Email", cell: (row) => row.email || "—" },
    {
      key: "acciones",
      header: "Acciones",
      cell: (row) => <Button variant="outline" size="sm" onClick={() => setSelected(row)}>Ver</Button>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Personas"
        description="Datos comunes de clientes, proveedores y contactos"
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva Persona</Button>}
      />
      <div className="mb-4 max-w-sm">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o identificación" />
      </div>
      <DataTable
        columns={columns}
        data={personas}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyHeading="No hay personas"
        emptyDescription="Registra una Persona para asociarla después a un cliente o proveedor"
      />
      {selected && (
        <DetailModal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={`${selected.nombre} ${selected.apellido}`}
          sections={[{ fields: [
            { label: "Identificación", value: selected.identificacion },
            { label: "Tipo", value: selected.tipo_identificacion },
            { label: "Email", value: selected.email || "—" },
            { label: "Teléfono", value: selected.telefono || "—" },
            { label: "Dirección", value: selected.direccion || "—", full: true },
          ] }]}
        />
      )}
      <DetailModal
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva Persona"
        subtitle="Registra primero los datos comunes. Luego podrás asociarla a un cliente o proveedor."
        footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleCreate} disabled={create.isPending}>{create.isPending ? "Guardando..." : "Guardar"}</Button></div>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Identificación" required><Input value={form.identificacion} onChange={(event) => setField("identificacion", event.target.value)} /></FormField>
          <FormField label="Tipo de identificación" required><select className="h-10 rounded-lg border border-input bg-white px-3 text-sm" value={form.tipo_identificacion} onChange={(event) => setField("tipo_identificacion", event.target.value)}><option value="CEDULA">Cédula</option><option value="RUC">RUC</option><option value="PASAPORTE">Pasaporte</option></select></FormField>
          <FormField label="Nombre" required><Input value={form.nombre} onChange={(event) => setField("nombre", event.target.value)} /></FormField>
          <FormField label="Apellido" required><Input value={form.apellido} onChange={(event) => setField("apellido", event.target.value)} /></FormField>
          <FormField label="Dirección"><Input value={form.direccion} onChange={(event) => setField("direccion", event.target.value)} /></FormField>
          <FormField label="Teléfono"><Input value={form.telefono} onChange={(event) => setField("telefono", event.target.value)} /></FormField>
          <FormField label="Ciudad"><Input value={form.ciudad} onChange={(event) => setField("ciudad", event.target.value)} /></FormField>
          <FormField label="Email"><Input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} /></FormField>
        </div>
      </DetailModal>
    </div>
  );
}
