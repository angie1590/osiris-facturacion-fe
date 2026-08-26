import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column, type SortState } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { DetailModal } from "@/components/shared/DetailModal";
import type { Persona } from "@/types/api";

export default function ClientesPage() {
  const [sort, setSort] = useState<SortState | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Persona | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCliente, setNewCliente] = useState({ identificacion: "", razon_social: "" });

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["personas", "cliente"],
    queryFn: async () => (await api.get<Persona[]>("/personas/cliente")).data,
  });

  const handleCreate = async () => {
    if (!newCliente.razon_social || !newCliente.identificacion) return;
    try {
      await api.post("/personas", {
        tipo: "cliente",
        identificacion_tipo: "ruc",
        identificacion: newCliente.identificacion,
        razon_social: newCliente.razon_social,
      });
      setNewCliente({ identificacion: "", razon_social: "" });
      setShowNewForm(false);
      await refetch();
    } catch (err) {
      console.error(err);
    }
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
    {
      key: "email",
      header: "Email",
      cell: (row) => row.email || "—",
    },
    {
      key: "telefono",
      header: "Teléfono",
      cell: (row) => row.telefono || "—",
    },
    {
      key: "acciones",
      header: "Acciones",
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedCliente(row);
            setShowDetail(true);
          }}
        >
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gestiona tu catálogo de clientes"
        actions={
          <Button onClick={() => setShowNewForm(true)}>
            + Nuevo Cliente
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyHeading="No hay clientes"
        emptyDescription="Comienza agregando tu primer cliente"
        sort={sort}
        onSortChange={setSort}
      />

      {selectedCliente && (
        <DetailModal
          open={showDetail}
          onClose={() => setShowDetail(false)}
          title={selectedCliente.razon_social}
          sections={[
            {
              fields: [
                { label: "Identificación", value: selectedCliente.identificacion },
                { label: "Email", value: selectedCliente.email || "—" },
                { label: "Teléfono", value: selectedCliente.telefono || "—" },
                { label: "Dirección", value: selectedCliente.direccion || "—", full: true },
              ],
            },
          ]}
        />
      )}

      <DetailModal
        open={showNewForm}
        onClose={() => setShowNewForm(false)}
        title="Nuevo Cliente"
        sections={[
          {
            fields: [
              {
                label: "Identificación",
                value: (
                  <Input
                    value={newCliente.identificacion}
                    onChange={(e) =>
                      setNewCliente({ ...newCliente, identificacion: e.target.value })
                    }
                    placeholder="1234567890"
                  />
                ),
              },
              {
                label: "Razón Social",
                value: (
                  <Input
                    value={newCliente.razon_social}
                    onChange={(e) =>
                      setNewCliente({ ...newCliente, razon_social: e.target.value })
                    }
                    placeholder="Empresa XYZ"
                  />
                ),
              },
            ],
          },
        ]}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Guardar</Button>
          </div>
        }
      />
    </div>
  );
}
