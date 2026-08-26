import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column, type SortState } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { FormField } from "@/components/shared/FormField";
import { PageHeader } from "@/components/shared/PageHeader";
import { usePersonas } from "@/features/personas/hooks/usePersonas";
import type { Persona } from "@/types/api";
import type { PersonaTipo } from "@/features/personas/api";

interface PersonasPageProps {
  tipo: PersonaTipo;
  title: string;
  singularLabel: string;
  description: string;
}

export function PersonasPage({ tipo, title, singularLabel, description }: PersonasPageProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [selected, setSelected] = useState<Persona | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ identificacion: "", razon_social: "" });
  const { data = [], isLoading, isError, refetch, create } = usePersonas(tipo);

  const handleCreate = async () => {
    if (!form.identificacion.trim() || !form.razon_social.trim()) return;
    await create.mutateAsync(form);
    setForm({ identificacion: "", razon_social: "" });
    setIsCreateOpen(false);
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
      <PageHeader
        title={title}
        description={description}
        actions={<Button onClick={() => setIsCreateOpen(true)}>+ Nuevo {singularLabel}</Button>}
      />

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
        onClose={() => setIsCreateOpen(false)}
        title={`Nuevo ${singularLabel}`}
        subtitle={`Ingresa los datos del ${singularLabel.toLowerCase()}.`}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Identificación" required>
            <Input
              value={form.identificacion}
              onChange={(event) => setForm({ ...form, identificacion: event.target.value })}
              placeholder="1234567890"
            />
          </FormField>
          <FormField label="Razón Social" required>
            <Input
              value={form.razon_social}
              onChange={(event) => setForm({ ...form, razon_social: event.target.value })}
              placeholder="Empresa XYZ"
            />
          </FormField>
        </div>
      </DetailModal>
    </div>
  );
}
