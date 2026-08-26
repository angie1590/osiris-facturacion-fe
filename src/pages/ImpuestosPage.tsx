import { useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import api from "@/lib/api";

type Impuesto = { id: string; tipo_impuesto: string; codigo_sri: string; descripcion: string; aplica_a: string; porcentaje_iva: string | null; vigente_desde: string; vigente_hasta: string | null; activo: boolean };

export default function ImpuestosPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["impuestos-canonicos"], queryFn: async () => (await api.get<Impuesto[]>("/impuestos/activos-vigentes")).data });
  const filtered = (query.data ?? []).filter((item) => `${item.descripcion} ${item.codigo_sri} ${item.tipo_impuesto}`.toLowerCase().includes(search.toLowerCase()));
  const columns: Column<Impuesto>[] = [
    { key: "tipo", header: "Tipo", cell: (row) => <Badge variant="secondary">{row.tipo_impuesto}</Badge> },
    { key: "codigo", header: "Código SRI", cell: (row) => row.codigo_sri },
    { key: "descripcion", header: "Descripción", cell: (row) => row.descripcion },
    { key: "porcentaje", header: "Porcentaje", cell: (row) => row.porcentaje_iva ? `${row.porcentaje_iva}%` : "—" },
    { key: "aplica", header: "Aplica a", cell: (row) => row.aplica_a },
    { key: "vigencia", header: "Vigente desde", cell: (row) => row.vigente_desde },
  ];
  return <div><PageHeader title="Impuestos SRI" description="Catálogo tributario vigente para productos y comprobantes" /><div className="relative mb-4 max-w-sm"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar impuesto" /></div><DataTable columns={columns} data={filtered} rowKey={(row) => row.id} isLoading={query.isLoading} isError={query.isError} onRetry={query.refetch} emptyHeading="No hay impuestos" emptyDescription="El catálogo SRI vigente aparecerá aquí." /></div>;
}
