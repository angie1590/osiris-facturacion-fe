import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useClientes,
  useCreateCliente,
  useCreatePersona,
  useCreateProveedorPersona,
  useCreateProveedorSociedad,
  usePersonas,
  useProveedoresPersona,
  useProveedoresSociedad,
  useTiposCliente,
} from "@/features/personas/hooks";
import type {
  Persona,
  TipoIdentificacion,
  Cliente,
  ProveedorPersona,
  ProveedorSociedad,
} from "@/features/personas/api";

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
  const clientesQuery = useClientes();
  const proveedoresPersonaQuery = useProveedoresPersona();
  const proveedoresSociedadQuery = useProveedoresSociedad();
  const create = useCreatePersona();
  const createCliente = useCreateCliente();
  const createProveedor = useCreateProveedorPersona();
  const createSociedad = useCreateProveedorSociedad();
  const { data: tiposCliente = [] } = useTiposCliente();
  const [form, setForm] = useState(initialForm);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Persona | null>(null);
  const [associationOpen, setAssociationOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("personas");
  const [specialization, setSpecialization] = useState<"cliente" | "proveedor" | "sociedad">("cliente");
  const [tipoClienteId, setTipoClienteId] = useState("");
  const [tipoContribuyenteId, setTipoContribuyenteId] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [sociedad, setSociedad] = useState({ ruc: "", razon_social: "", nombre_comercial: "", direccion: "", telefono: "", email: "", tipo_contribuyente_id: "" });

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

  const handleSpecialize = async () => {
    if (!selected) return;
    if (specialization === "cliente" && tipoClienteId) {
      await createCliente.mutateAsync({ personaId: selected.id, tipoClienteId });
    } else if (specialization === "proveedor" && tipoContribuyenteId) {
      await createProveedor.mutateAsync({
        personaId: selected.id,
        tipoContribuyenteId,
        nombreComercial,
      });
    } else if (specialization === "sociedad" && sociedad.ruc && sociedad.razon_social && sociedad.direccion && sociedad.telefono && sociedad.email && sociedad.tipo_contribuyente_id) {
      await createSociedad.mutateAsync({
        ...sociedad,
        nombre_comercial: sociedad.nombre_comercial || undefined,
        persona_contacto_id: selected.id,
        usuario_auditoria: "frontend",
      });
    } else {
      return;
    }
    setTipoClienteId("");
    setTipoContribuyenteId("");
    setNombreComercial("");
    setSociedad({ ruc: "", razon_social: "", nombre_comercial: "", direccion: "", telefono: "", email: "", tipo_contribuyente_id: "" });
    setAssociationOpen(false);
    setSelected(null);
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

  const personaName = (id: string) => {
    const persona = data?.items.find((item) => item.id === id);
    return persona ? `${persona.nombre} ${persona.apellido}` : id;
  };

  const clienteColumns: Column<Cliente>[] = [
    { key: "persona", header: "Persona", cell: (row) => personaName(row.persona_id) },
    { key: "tipo", header: "Tipo de cliente", cell: (row) => row.tipo_cliente_id },
  ];

  const proveedorPersonaColumns: Column<ProveedorPersona>[] = [
    { key: "persona", header: "Persona", cell: (row) => personaName(row.persona_id) },
    { key: "nombre", header: "Nombre comercial", cell: (row) => row.nombre_comercial || "—" },
    { key: "contribuyente", header: "Contribuyente", cell: (row) => row.tipo_contribuyente_id },
  ];

  const proveedorSociedadColumns: Column<ProveedorSociedad>[] = [
    { key: "ruc", header: "RUC", cell: (row) => row.ruc },
    { key: "razon", header: "Razón social", cell: (row) => row.razon_social },
    { key: "email", header: "Email", cell: (row) => row.email },
    { key: "contacto", header: "Contacto", cell: (row) => personaName(row.persona_contacto_id) },
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
      <Tabs value={view} onValueChange={setView} className="space-y-4">
        <TabsList>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="proveedores-persona">Proveedores Persona</TabsTrigger>
          <TabsTrigger value="proveedores-sociedad">Proveedores Sociedad</TabsTrigger>
        </TabsList>
        <TabsContent value="personas">
          <DataTable columns={columns} data={personas} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay personas" emptyDescription="Registra una Persona para asociarla después a un cliente o proveedor" />
        </TabsContent>
        <TabsContent value="clientes">
          <DataTable columns={clienteColumns} data={clientesQuery.data ?? []} rowKey={(row) => row.id} isLoading={clientesQuery.isLoading} isError={clientesQuery.isError} onRetry={clientesQuery.refetch} emptyHeading="No hay clientes" emptyDescription="Asocia una Persona como cliente desde su detalle" />
        </TabsContent>
        <TabsContent value="proveedores-persona">
          <DataTable columns={proveedorPersonaColumns} data={proveedoresPersonaQuery.data ?? []} rowKey={(row) => row.id} isLoading={proveedoresPersonaQuery.isLoading} isError={proveedoresPersonaQuery.isError} onRetry={proveedoresPersonaQuery.refetch} emptyHeading="No hay proveedores persona" emptyDescription="Asocia una Persona como proveedor persona desde su detalle" />
        </TabsContent>
        <TabsContent value="proveedores-sociedad">
          <DataTable columns={proveedorSociedadColumns} data={proveedoresSociedadQuery.data ?? []} rowKey={(row) => row.id} isLoading={proveedoresSociedadQuery.isLoading} isError={proveedoresSociedadQuery.isError} onRetry={proveedoresSociedadQuery.refetch} emptyHeading="No hay proveedores sociedad" emptyDescription="Crea una sociedad desde el detalle de una Persona de contacto" />
        </TabsContent>
      </Tabs>
      {selected && (
        <DetailModal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={`${selected.nombre} ${selected.apellido}`}
          footer={<div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
            <Button onClick={() => { setSpecialization("cliente"); setAssociationOpen(true); }}>Asociar como Cliente</Button>
            <Button variant="outline" onClick={() => { setSpecialization("proveedor"); setAssociationOpen(true); }}>Asociar como Proveedor</Button>
            <Button variant="outline" onClick={() => { setSpecialization("sociedad"); setAssociationOpen(true); }}>Proveedor Sociedad</Button>
          </div>}
          sections={[{ fields: [
            { label: "Identificación", value: selected.identificacion },
            { label: "Tipo", value: selected.tipo_identificacion },
            { label: "Email", value: selected.email || "—" },
            { label: "Teléfono", value: selected.telefono || "—" },
            { label: "Dirección", value: selected.direccion || "—", full: true },
          ] }]}
        />
      )}
      {selected && (
        <DetailModal
          open={associationOpen}
          onClose={() => setAssociationOpen(false)}
          title={`Asociar ${specialization === "cliente" ? "Cliente" : specialization === "proveedor" ? "Proveedor Persona" : "Proveedor Sociedad"}`}
          subtitle="La Persona ya existe. Completa únicamente los datos propios de la especialización."
          footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setAssociationOpen(false)}>Cancelar</Button><Button onClick={handleSpecialize} disabled={createCliente.isPending || createProveedor.isPending || createSociedad.isPending}>{createCliente.isPending || createProveedor.isPending || createSociedad.isPending ? "Guardando..." : "Guardar asociación"}</Button></div>}
        >
          {specialization === "cliente" ? (
            <FormField label="Tipo de cliente" required>
              <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={tipoClienteId} onChange={(event) => setTipoClienteId(event.target.value)}>
                <option value="">Selecciona un tipo</option>
                {tiposCliente.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
              </select>
            </FormField>
          ) : specialization === "proveedor" ? (
            <div className="space-y-4">
              <FormField label="Tipo de contribuyente" required><Input value={tipoContribuyenteId} onChange={(event) => setTipoContribuyenteId(event.target.value)} placeholder="Código del catálogo SRI" maxLength={2} /></FormField>
              <FormField label="Nombre comercial"><Input value={nombreComercial} onChange={(event) => setNombreComercial(event.target.value)} /></FormField>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="RUC" required><Input value={sociedad.ruc} onChange={(event) => setSociedad({ ...sociedad, ruc: event.target.value })} maxLength={13} /></FormField>
              <FormField label="Razón social" required><Input value={sociedad.razon_social} onChange={(event) => setSociedad({ ...sociedad, razon_social: event.target.value })} /></FormField>
              <FormField label="Nombre comercial"><Input value={sociedad.nombre_comercial} onChange={(event) => setSociedad({ ...sociedad, nombre_comercial: event.target.value })} /></FormField>
              <FormField label="Tipo de contribuyente" required><Input value={sociedad.tipo_contribuyente_id} onChange={(event) => setSociedad({ ...sociedad, tipo_contribuyente_id: event.target.value })} maxLength={2} /></FormField>
              <FormField label="Dirección" required><Input value={sociedad.direccion} onChange={(event) => setSociedad({ ...sociedad, direccion: event.target.value })} /></FormField>
              <FormField label="Teléfono" required><Input value={sociedad.telefono} onChange={(event) => setSociedad({ ...sociedad, telefono: event.target.value })} /></FormField>
              <FormField label="Email" required><Input type="email" value={sociedad.email} onChange={(event) => setSociedad({ ...sociedad, email: event.target.value })} /></FormField>
            </div>
          )}
        </DetailModal>
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
