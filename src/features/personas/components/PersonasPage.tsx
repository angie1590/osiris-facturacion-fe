import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column, type SortState } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { PageHeader } from "@/components/shared/PageHeader";
import { searchPersona, type PersonaTipo } from "@/features/personas/api";
import { usePersonas } from "@/features/personas/hooks/usePersonas";
import type { Persona } from "@/types/api";

interface PersonasPageProps {
  tipo: PersonaTipo;
  title: string;
  singularLabel: string;
  description: string;
  showHeader?: boolean;
}

export function PersonasPage({ tipo, title, singularLabel, description, showHeader = true }: PersonasPageProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [selected, setSelected] = useState<Persona | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [found, setFound] = useState<Persona | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [form, setForm] = useState({
    identificacion: "",
    razon_social: "",
    nombre_comercial: "",
    email: "",
    telefono: "",
    direccion: "",
  });
  const { data = [], isLoading, isError, refetch, create } = usePersonas(tipo);

  const handleCreate = async () => {
    if (!form.identificacion.trim() || !form.razon_social.trim()) return;
    await create.mutateAsync({
      identificacion: form.identificacion,
      razon_social: form.razon_social,
      nombre_comercial: form.nombre_comercial || undefined,
      email: form.email || undefined,
      telefono: form.telefono || undefined,
      direccion: form.direccion || undefined,
    });
    resetForm();
    setIsCreateOpen(false);
  };

  const resetForm = () => {
    setForm({
      identificacion: "",
      razon_social: "",
      nombre_comercial: "",
      email: "",
      telefono: "",
      direccion: "",
    });
    setFound(null);
    setSearchMessage("");
  };

  const handleSearch = async () => {
    const identificacion = form.identificacion.trim();
    if (!identificacion) return;
    setSearching(true);
    setSearchMessage("");
    try {
      const persona = await searchPersona(identificacion);
      if (persona) {
        setFound(persona);
        setForm({
          identificacion: persona.identificacion,
          razon_social: persona.razon_social,
          nombre_comercial: persona.nombre_comercial || "",
          email: persona.email || "",
          telefono: persona.telefono || "",
          direccion: persona.direccion || "",
        });
        setSearchMessage("Persona encontrada. Sus datos comunes fueron cargados.");
      } else {
        setFound(null);
        setSearchMessage("No existe. Completa los datos de la Persona para registrarla.");
      }
    } catch {
      setSearchMessage("No se pudo buscar la Persona. Intenta nuevamente.");
    } finally {
      setSearching(false);
    }
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const columns: Column<Persona>[] = [
    {
      key: "identificacion",
      header: "Identificación",
      cell: (row) => row.identificacion,
      sortable: true,
      sortAccessor: (row) => row.identificacion,
    },
    {
      key: "razon_social",
      header: "Razón Social",
      cell: (row) => row.razon_social,
      sortable: true,
      sortAccessor: (row) => row.razon_social,
    },
    { key: "email", header: "Email", cell: (row) => row.email || "—" },
    { key: "telefono", header: "Teléfono", cell: (row) => row.telefono || "—" },
    {
      key: "acciones",
      header: "Acciones",
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => setSelected(row)}>
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div>
      {showHeader && (
        <PageHeader
          title={title}
          description={description}
          actions={<Button onClick={openCreate}>+ Nuevo {singularLabel}</Button>}
        />
      )}

      {!showHeader && (
        <div className="mb-4 flex justify-end">
          <Button onClick={openCreate}>+ Nuevo {singularLabel}</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyHeading={`No hay ${title.toLowerCase()}`}
        emptyDescription={`Comienza agregando tu primer ${singularLabel.toLowerCase()}`}
        sort={sort}
        onSortChange={setSort}
      />

      {selected && (
        <DetailModal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={selected.razon_social}
          sections={[{
            fields: [
              { label: "Identificación", value: selected.identificacion },
              { label: "Email", value: selected.email || "—" },
              { label: "Teléfono", value: selected.telefono || "—" },
              { label: "Dirección", value: selected.direccion || "—", full: true },
            ],
          }]}
        />
      )}

      <DetailModal
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetForm();
        }}
        title={`Nuevo ${singularLabel}`}
        subtitle="Busca primero la identificación para reutilizar los datos de la Persona."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={create.isPending || Boolean(found)}>
              {create.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex items-end gap-2">
            <FormField label="Identificación" required className="min-w-0 flex-1">
            <Input
              value={form.identificacion}
              onChange={(event) => setForm({ ...form, identificacion: event.target.value })}
              placeholder="1234567890"
              disabled={Boolean(found)}
            />
            </FormField>
            <Button variant="outline" onClick={handleSearch} disabled={searching || Boolean(found)}>
              {searching ? "Buscando..." : "Buscar"}
            </Button>
          </div>
          {searchMessage && <p className="text-sm text-muted-foreground">{searchMessage}</p>}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Datos de la Persona</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Razón Social" required>
                <Input
                  value={form.razon_social}
                  onChange={(event) => setForm({ ...form, razon_social: event.target.value })}
                  placeholder="Empresa XYZ"
                  disabled={Boolean(found)}
                />
              </FormField>
              <FormField label="Nombre Comercial">
                <Input
                  value={form.nombre_comercial}
                  onChange={(event) => setForm({ ...form, nombre_comercial: event.target.value })}
                  disabled={Boolean(found)}
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  disabled={Boolean(found)}
                />
              </FormField>
              <FormField label="Teléfono">
                <Input
                  value={form.telefono}
                  onChange={(event) => setForm({ ...form, telefono: event.target.value })}
                  disabled={Boolean(found)}
                />
              </FormField>
              <FormField label="Dirección" className="sm:col-span-2">
                <Input
                  value={form.direccion}
                  onChange={(event) => setForm({ ...form, direccion: event.target.value })}
                  disabled={Boolean(found)}
                />
              </FormField>
            </div>
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Datos de {singularLabel}</h3>
            <p className="text-sm text-muted-foreground">
              Aquí se agregarán los campos propios de {singularLabel.toLowerCase()}.
            </p>
          </section>
        </div>
      </DetailModal>
    </div>
  );
}
