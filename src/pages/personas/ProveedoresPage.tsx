import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column, type SortState } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { DetailModal } from "@/components/shared/DetailModal";
import type { Persona } from "@/types/api";

export default function ProveedoresPage() {
  const [sort, setSort] = useState<SortState | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Persona | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProveedor, setNewProveedor] = useState({ identificacion: "", razon_social: "" });

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["personas", "proveedor"],
    queryFn: async () => (await api.get<Persona[]>("/personas/proveedor")).data,
  });

  const handleCreate = async () => {
    if (!newProveedor.razon_social || !newProveedor.identificacion) return;
    try {
      await api.post("/personas", {
        tipo: "proveedor",
        identificacion_tipo: "ruc",
        identificacion: newProveedor.identificacion,
        razon_social: newProveedor.razon_social,
      });
      setNewProveedor({ identificacion: "", razon_social: "" });
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
            setSelectedProveedor(row);
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
        title="Proveedores"
        description="Gestiona tu catálogo de proveedores"
        actions={
          <Button onClick={() => setShowNewForm(true)}>
            + Nuevo Proveedor
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
        emptyHeading="No hay proveedores"
        emptyDescription="Comienza agregando tu primer proveedor"
        sort={sort}
        onSortChange={setSort}
      />

      {selectedProveedor && (
        <DetailModal
          open={showDetail}
          onClose={() => setShowDetail(false)}
          title={selectedProveedor.razon_social}
          sections={[
            {
              fields: [
                { label: "Identificación", value: selectedProveedor.identificacion },
                { label: "Email", value: selectedProveedor.email || "—" },
                { label: "Teléfono", value: selectedProveedor.telefono || "—" },
                { label: "Dirección", value: selectedProveedor.direccion || "—", full: true },
              ],
            },
          ]}
        />
      )}

      <DetailModal
        open={showNewForm}
        onClose={() => setShowNewForm(false)}
        title="Nuevo Proveedor"
        sections={[
          {
            fields: [
              {
                label: "Identificación",
                value: (
                  <Input
                    value={newProveedor.identificacion}
                    onChange={(e) =>
                      setNewProveedor({ ...newProveedor, identificacion: e.target.value })
                    }
                    placeholder="1234567890"
                  />
                ),
              },
              {
                label: "Razón Social",
                value: (
                  <Input
                    value={newProveedor.razon_social}
                    onChange={(e) =>
                      setNewProveedor({ ...newProveedor, razon_social: e.target.value })
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
