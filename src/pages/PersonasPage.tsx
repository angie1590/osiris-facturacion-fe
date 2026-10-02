import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useClientes,
  useCreateCliente,
  useCreatePersona,
  useCreateProveedorPersona,
  useCreateProveedorSociedad,
  useUpdatePersona,
  usePersonas,
  useProveedoresPersona,
  useProveedoresSociedad,
  useSetPersonaActive,
  useTiposCliente,
  useTiposContribuyente,
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
  const [onlyActive, setOnlyActive] = useState(true);
  const { data, isLoading, isError, refetch } = usePersonas(onlyActive);
  const clientesQuery = useClientes();
  const proveedoresPersonaQuery = useProveedoresPersona();
  const proveedoresSociedadQuery = useProveedoresSociedad();
  const create = useCreatePersona();
  const update = useUpdatePersona();
  const setActive = useSetPersonaActive();
  const createCliente = useCreateCliente();
  const createProveedor = useCreateProveedorPersona();
  const createSociedad = useCreateProveedorSociedad();
  const { data: tiposCliente = [] } = useTiposCliente();
  const { data: tiposContribuyente = [] } = useTiposContribuyente();
  const [form, setForm] = useState(initialForm);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Persona | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [statusTarget, setStatusTarget] = useState<Persona | null>(null);
  const [associationOpen, setAssociationOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("personas");
  const [specialization, setSpecialization] = useState<
    "cliente" | "proveedor" | "sociedad"
  >("cliente");
  const [tipoClienteId, setTipoClienteId] = useState("");
  const [tipoContribuyenteId, setTipoContribuyenteId] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [sociedad, setSociedad] = useState({
    ruc: "",
    razon_social: "",
    nombre_comercial: "",
    direccion: "",
    telefono: "",
    email: "",
    tipo_contribuyente_id: "",
  });

  const personas = (data?.items ?? []).filter(
    (persona) =>
      persona.activo === onlyActive &&
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

  const handleEdit = (persona: Persona) => {
    setForm({
      identificacion: persona.identificacion,
      tipo_identificacion: persona.tipo_identificacion,
      nombre: persona.nombre,
      apellido: persona.apellido,
      direccion: persona.direccion ?? "",
      telefono: persona.telefono ?? "",
      ciudad: persona.ciudad ?? "",
      email: persona.email ?? "",
    });
    setSelected(null);
    setEditingPersona(persona);
    setOpen(true);
  };

  const handleUpdate = async () => {
    if (
      !editingPersona ||
      !form.identificacion ||
      !form.nombre ||
      !form.apellido
    )
      return;
    await update.mutateAsync({
      id: editingPersona.id,
      input: {
        ...form,
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        ciudad: form.ciudad || null,
        email: form.email || null,
        usuario_auditoria: "frontend",
      },
    });
    setForm(initialForm);
    setEditingPersona(null);
    setOpen(false);
  };

  const handleSpecialize = async () => {
    if (!selected) return;
    if (specialization === "cliente" && tipoClienteId) {
      await createCliente.mutateAsync({
        personaId: selected.id,
        tipoClienteId,
      });
    } else if (specialization === "proveedor" && tipoContribuyenteId) {
      await createProveedor.mutateAsync({
        personaId: selected.id,
        tipoContribuyenteId,
        nombreComercial,
      });
    } else if (
      specialization === "sociedad" &&
      sociedad.ruc &&
      sociedad.razon_social &&
      sociedad.direccion &&
      sociedad.telefono &&
      sociedad.email &&
      sociedad.tipo_contribuyente_id
    ) {
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
    setSociedad({
      ruc: "",
      razon_social: "",
      nombre_comercial: "",
      direccion: "",
      telefono: "",
      email: "",
      tipo_contribuyente_id: "",
    });
    setAssociationOpen(false);
    setSelected(null);
  };

  const columns: Column<Persona>[] = [
    {
      key: "identificacion",
      header: "Identificación",
      sortable: true,
      sortAccessor: (row) => row.identificacion,
      cell: (row) => row.identificacion,
    },
    {
      key: "nombre",
      header: "Nombre",
      sortable: true,
      sortAccessor: (row) => `${row.nombre} ${row.apellido}`,
      cell: (row) => (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-left font-medium text-primary hover:underline"
          onClick={() => setSelected(row)}
        >
          {row.nombre} {row.apellido}
        </button>
      ),
    },
    {
      key: "telefono",
      header: "Teléfono",
      sortable: true,
      sortAccessor: (row) => row.telefono ?? "",
      cell: (row) => row.telefono || "—",
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      sortAccessor: (row) => row.email ?? "",
      cell: (row) => row.email || "—",
    },
  ];

  const personaName = (id: string) => {
    const persona = data?.items.find((item) => item.id === id);
    return persona ? `${persona.nombre} ${persona.apellido}` : id;
  };
  const tipoClienteName = (id: string) =>
    tiposCliente.find((item) => item.id === id)?.nombre ?? "Tipo no disponible";
  const tipoContribuyenteName = (id: string) =>
    tiposContribuyente.find((item) => item.codigo === id)?.nombre ??
    "Tipo no disponible";

  const clienteColumns: Column<Cliente>[] = [
    {
      key: "persona",
      header: "Persona",
      sortable: true,
      sortAccessor: (row) => personaName(row.persona_id),
      cell: (row) => personaName(row.persona_id),
    },
    {
      key: "tipo",
      header: "Tipo de cliente",
      sortable: true,
      sortAccessor: (row) => tipoClienteName(row.tipo_cliente_id),
      cell: (row) => tipoClienteName(row.tipo_cliente_id),
    },
  ];

  const proveedorPersonaColumns: Column<ProveedorPersona>[] = [
    {
      key: "persona",
      header: "Persona",
      sortable: true,
      sortAccessor: (row) => personaName(row.persona_id),
      cell: (row) => personaName(row.persona_id),
    },
    {
      key: "nombre",
      header: "Nombre comercial",
      sortable: true,
      sortAccessor: (row) => row.nombre_comercial ?? "",
      cell: (row) => row.nombre_comercial || "—",
    },
    {
      key: "contribuyente",
      header: "Contribuyente",
      sortable: true,
      sortAccessor: (row) => tipoContribuyenteName(row.tipo_contribuyente_id),
      cell: (row) => tipoContribuyenteName(row.tipo_contribuyente_id),
    },
  ];

  const proveedorSociedadColumns: Column<ProveedorSociedad>[] = [
    {
      key: "ruc",
      header: "RUC",
      sortable: true,
      sortAccessor: (row) => row.ruc,
      cell: (row) => row.ruc,
    },
    {
      key: "razon",
      header: "Razón social",
      sortable: true,
      sortAccessor: (row) => row.razon_social,
      cell: (row) => row.razon_social,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      sortAccessor: (row) => row.email,
      cell: (row) => row.email,
    },
    {
      key: "contacto",
      header: "Contacto",
      sortable: true,
      sortAccessor: (row) => personaName(row.persona_contacto_id),
      cell: (row) => personaName(row.persona_contacto_id),
    },
  ];

  const expandablePersona = (persona: Persona) => (
    <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-muted-foreground">Tipo de identificación</p>
        <p className="font-medium">{persona.tipo_identificacion}</p>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="text-muted-foreground">Dirección</p>
        <p>{persona.direccion || "—"}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Ciudad</p>
        <p>{persona.ciudad || "—"}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Estado</p>
        <p>{persona.activo ? "Activa" : "Inactiva"}</p>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Personas"
        description="Datos comunes de clientes, proveedores y contactos"
        actions={
          <Button
            onClick={() => {
              setForm(initialForm);
              setEditingPersona(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Persona
          </Button>
        }
      />
      <FilterBar className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o identificación..."
        />
        <Select
          value={onlyActive ? "active" : "inactive"}
          onValueChange={(value) => setOnlyActive(value === "active")}
        >
          <SelectTrigger className="w-36" aria-label="Estado de personas">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="inactive">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>
      <Tabs value={view} onValueChange={setView} className="space-y-4">
        <TabsList>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="proveedores-persona">
            Proveedores Persona
          </TabsTrigger>
          <TabsTrigger value="proveedores-sociedad">
            Proveedores Sociedad
          </TabsTrigger>
        </TabsList>
        <TabsContent value="personas">
          <DataTable
            columns={columns}
            data={personas}
            rowKey={(row) => row.id}
            expandableRow={expandablePersona}
            rowActions={{
              getLabel: (row) => `persona ${row.nombre} ${row.apellido}`,
              isActive: (row) => row.activo,
              onView: setSelected,
              onEdit: handleEdit,
              onToggleActive: setStatusTarget,
            }}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            defaultSort={{ key: "nombre", dir: "asc" }}
            emptyHeading="No hay personas"
            emptyDescription="Registra una Persona para asociarla después a un cliente o proveedor"
          />
        </TabsContent>
        <TabsContent value="clientes">
          <DataTable
            columns={clienteColumns}
            data={clientesQuery.data ?? []}
            rowKey={(row) => row.id}
            isLoading={clientesQuery.isLoading}
            isError={clientesQuery.isError}
            onRetry={clientesQuery.refetch}
            defaultSort={{ key: "persona", dir: "asc" }}
            emptyHeading="No hay clientes"
            emptyDescription="Asocia una Persona como cliente desde su detalle"
          />
        </TabsContent>
        <TabsContent value="proveedores-persona">
          <DataTable
            columns={proveedorPersonaColumns}
            data={proveedoresPersonaQuery.data ?? []}
            rowKey={(row) => row.id}
            isLoading={proveedoresPersonaQuery.isLoading}
            isError={proveedoresPersonaQuery.isError}
            onRetry={proveedoresPersonaQuery.refetch}
            defaultSort={{ key: "persona", dir: "asc" }}
            emptyHeading="No hay proveedores persona"
            emptyDescription="Asocia una Persona como proveedor persona desde su detalle"
          />
        </TabsContent>
        <TabsContent value="proveedores-sociedad">
          <DataTable
            columns={proveedorSociedadColumns}
            data={proveedoresSociedadQuery.data ?? []}
            rowKey={(row) => row.id}
            isLoading={proveedoresSociedadQuery.isLoading}
            isError={proveedoresSociedadQuery.isError}
            onRetry={proveedoresSociedadQuery.refetch}
            defaultSort={{ key: "razon", dir: "asc" }}
            emptyHeading="No hay proveedores sociedad"
            emptyDescription="Crea una sociedad desde el detalle de una Persona de contacto"
          />
        </TabsContent>
      </Tabs>
      {selected && (
        <DetailModal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={`${selected.nombre} ${selected.apellido}`}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
              <Button variant="outline" onClick={() => handleEdit(selected)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button
                onClick={() => {
                  setSpecialization("cliente");
                  setAssociationOpen(true);
                }}
              >
                Asociar como Cliente
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSpecialization("proveedor");
                  setAssociationOpen(true);
                }}
              >
                Asociar como Proveedor
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSpecialization("sociedad");
                  setAssociationOpen(true);
                }}
              >
                Proveedor Sociedad
              </Button>
            </div>
          }
          sections={[
            {
              fields: [
                { label: "Identificación", value: selected.identificacion },
                { label: "Tipo", value: selected.tipo_identificacion },
                { label: "Email", value: selected.email || "—" },
                { label: "Teléfono", value: selected.telefono || "—" },
                {
                  label: "Dirección",
                  value: selected.direccion || "—",
                  full: true,
                },
              ],
            },
          ]}
        />
      )}
      {selected && (
        <DetailModal
          open={associationOpen}
          onClose={() => setAssociationOpen(false)}
          title={`Asociar ${specialization === "cliente" ? "Cliente" : specialization === "proveedor" ? "Proveedor Persona" : "Proveedor Sociedad"}`}
          subtitle="La Persona ya existe. Completa únicamente los datos propios de la especialización."
          footer={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAssociationOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSpecialize}
                disabled={
                  createCliente.isPending ||
                  createProveedor.isPending ||
                  createSociedad.isPending
                }
              >
                {createCliente.isPending ||
                createProveedor.isPending ||
                createSociedad.isPending
                  ? "Guardando..."
                  : "Guardar asociación"}
              </Button>
            </div>
          }
        >
          {specialization === "cliente" ? (
            <FormField label="Tipo de cliente" required>
              <select
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                value={tipoClienteId}
                onChange={(event) => setTipoClienteId(event.target.value)}
              >
                <option value="">Selecciona un tipo</option>
                {tiposCliente.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </FormField>
          ) : specialization === "proveedor" ? (
            <div className="space-y-4">
              <FormField label="Tipo de contribuyente" required>
                <select
                  className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                  value={tipoContribuyenteId}
                  onChange={(event) =>
                    setTipoContribuyenteId(event.target.value)
                  }
                >
                  <option value="">Selecciona un tipo</option>
                  {tiposContribuyente.map((item) => (
                    <option key={item.codigo} value={item.codigo}>
                      {item.codigo} · {item.nombre}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Nombre comercial">
                <Input
                  value={nombreComercial}
                  onChange={(event) => setNombreComercial(event.target.value)}
                />
              </FormField>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="RUC" required>
                <Input
                  value={sociedad.ruc}
                  onChange={(event) =>
                    setSociedad({ ...sociedad, ruc: event.target.value })
                  }
                  maxLength={13}
                />
              </FormField>
              <FormField label="Razón social" required>
                <Input
                  value={sociedad.razon_social}
                  onChange={(event) =>
                    setSociedad({
                      ...sociedad,
                      razon_social: event.target.value,
                    })
                  }
                />
              </FormField>
              <FormField label="Nombre comercial">
                <Input
                  value={sociedad.nombre_comercial}
                  onChange={(event) =>
                    setSociedad({
                      ...sociedad,
                      nombre_comercial: event.target.value,
                    })
                  }
                />
              </FormField>
              <FormField label="Tipo de contribuyente" required>
                <select
                  className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                  value={sociedad.tipo_contribuyente_id}
                  onChange={(event) =>
                    setSociedad({
                      ...sociedad,
                      tipo_contribuyente_id: event.target.value,
                    })
                  }
                >
                  <option value="">Selecciona un tipo</option>
                  {tiposContribuyente.map((item) => (
                    <option key={item.codigo} value={item.codigo}>
                      {item.codigo} · {item.nombre}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Dirección" required>
                <Input
                  value={sociedad.direccion}
                  onChange={(event) =>
                    setSociedad({ ...sociedad, direccion: event.target.value })
                  }
                />
              </FormField>
              <FormField label="Teléfono" required>
                <Input
                  value={sociedad.telefono}
                  onChange={(event) =>
                    setSociedad({ ...sociedad, telefono: event.target.value })
                  }
                />
              </FormField>
              <FormField label="Email" required>
                <Input
                  type="email"
                  value={sociedad.email}
                  onChange={(event) =>
                    setSociedad({ ...sociedad, email: event.target.value })
                  }
                />
              </FormField>
            </div>
          )}
        </DetailModal>
      )}
      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.activo ? "Desactivar persona" : "Activar persona"}
        description={
          statusTarget?.activo
            ? `La persona ${statusTarget.nombre} ${statusTarget.apellido} dejará de aparecer entre las activas. Podrás reactivarla desde el filtro de estado.`
            : `La persona ${statusTarget?.nombre ?? ""} ${statusTarget?.apellido ?? ""} volverá a aparecer entre las activas.`
        }
        confirmLabel={statusTarget?.activo ? "Desactivar" : "Activar"}
        variant={statusTarget?.activo ? "danger" : "default"}
        onConfirm={async () => {
          if (!statusTarget) return;
          await setActive.mutateAsync({
            id: statusTarget.id,
            active: !statusTarget.activo,
          });
          setStatusTarget(null);
        }}
      />
      <DetailModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingPersona(null);
        }}
        title={editingPersona ? "Editar Persona" : "Nueva Persona"}
        subtitle={
          editingPersona
            ? "Actualiza los datos comunes de esta persona."
            : "Registra primero los datos comunes. Luego podrás asociarla a un cliente o proveedor."
        }
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setEditingPersona(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={editingPersona ? handleUpdate : handleCreate}
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending
                ? "Guardando..."
                : editingPersona
                  ? "Actualizar"
                  : "Guardar"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Identificación" required>
            <Input
              value={form.identificacion}
              onChange={(event) =>
                setField("identificacion", event.target.value)
              }
            />
          </FormField>
          <FormField label="Tipo de identificación" required>
            <select
              className="h-10 rounded-lg border border-input bg-white px-3 text-sm"
              value={form.tipo_identificacion}
              onChange={(event) =>
                setField("tipo_identificacion", event.target.value)
              }
            >
              <option value="CEDULA">Cédula</option>
              <option value="RUC">RUC</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </FormField>
          <FormField label="Nombre" required>
            <Input
              value={form.nombre}
              onChange={(event) => setField("nombre", event.target.value)}
            />
          </FormField>
          <FormField label="Apellido" required>
            <Input
              value={form.apellido}
              onChange={(event) => setField("apellido", event.target.value)}
            />
          </FormField>
          <FormField label="Dirección">
            <Input
              value={form.direccion}
              onChange={(event) => setField("direccion", event.target.value)}
            />
          </FormField>
          <FormField label="Teléfono">
            <Input
              value={form.telefono}
              onChange={(event) => setField("telefono", event.target.value)}
            />
          </FormField>
          <FormField label="Ciudad">
            <Input
              value={form.ciudad}
              onChange={(event) => setField("ciudad", event.target.value)}
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
            />
          </FormField>
        </div>
      </DetailModal>
    </div>
  );
}
