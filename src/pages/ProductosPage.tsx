import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ProductoListado } from "@/features/productos/api";

export default function ProductosPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["productos"],
    queryFn: async () => (await api.get<{ items: ProductoListado[] }>("/productos", { params: { limit: 1000, offset: 0, only_active: true } })).data,
  });
  const productos = (data?.items ?? []).filter((producto) => producto.nombre.toLowerCase().includes(search.toLowerCase()));
  const columns: Column<ProductoListado>[] = [
    { key: "nombre", header: "Producto", cell: (row) => row.nombre, sortable: true, sortAccessor: (row) => row.nombre },
    { key: "tipo", header: "Tipo", cell: (row) => <Badge variant="secondary">{row.tipo === "BIEN" ? "Bien" : "Servicio"}</Badge> },
    { key: "pvp", header: "PVP", cell: (row) => `$ ${Number(row.pvp).toFixed(2)}`, align: "right" },
    { key: "cantidad", header: "Existencia", cell: (row) => row.cantidad, align: "right" },
  ];
  return (
    <div>
      <PageHeader title="Productos" description="Catálogo de productos del sistema integrado" />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto" />
      </div>
      <DataTable columns={columns} data={productos} rowKey={(row) => row.id} isLoading={isLoading} isError={isError} onRetry={refetch} emptyHeading="No hay productos" emptyDescription="Los productos registrados aparecerán aquí." />
    </div>
  );
}
