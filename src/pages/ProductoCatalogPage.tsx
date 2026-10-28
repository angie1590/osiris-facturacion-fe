import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailModal } from "@/components/shared/DetailModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { FormField } from "@/components/shared/FormField";
import { PageHeader } from "@/components/shared/PageHeader";
import { catalogAccess } from "@/features/categorias/catalog-access";
import { useCatalogPermissions } from "@/features/categorias/useCatalogPermissions";
import { ProductoIntegralForm } from "@/features/productos/ProductoIntegralForm";
import {
  getBodegas,
  getProducto,
  getProductos,
  getProveedoresPersona,
  getProveedoresSociedad,
  saveProductoBodega,
  saveProductoProveedores,
  type ProductoListado,
} from "@/features/productos/api";
import Forbidden from "@/pages/Forbidden";

export default function ProductoCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseQuantity, setWarehouseQuantity] = useState("0");
  const [providersOpen, setProvidersOpen] = useState(false);
  const [selectedPersonProviders, setSelectedPersonProviders] = useState<string[]>([]);
  const [selectedCompanyProviders, setSelectedCompanyProviders] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { context: permissionContext, permissions } = useCatalogPermissions();
  const readAccess = catalogAccess(permissionContext, "read_products");
  const canCreate = catalogAccess(permissionContext, "create_product") === "permitido";
  const canUpdate = catalogAccess(permissionContext, "update_product") === "permitido";

  const products = useQuery({
    queryKey: ["productos"],
    queryFn: () => getProductos(0, 1000),
    enabled: readAccess === "permitido",
  });
  const detail = useQuery({
    queryKey: ["producto-canonico", selectedId],
    queryFn: () => getProducto(selectedId!),
    enabled: readAccess === "permitido" && Boolean(selectedId),
  });
  const warehouses = useQuery({
    queryKey: ["bodegas-canonicas"],
    queryFn: getBodegas,
    enabled: warehouseOpen,
  });
  const personProviders = useQuery({
    queryKey: ["proveedores-persona-canonicos"],
    queryFn: getProveedoresPersona,
    enabled: providersOpen,
  });
  const companyProviders = useQuery({
    queryKey: ["proveedores-sociedad-canonicos"],
    queryFn: getProveedoresSociedad,
    enabled: providersOpen,
  });
  const saveWarehouse = useMutation({
    mutationFn: () => saveProductoBodega(
      selectedId!,
      warehouseId,
      Number(warehouseQuantity),
      Boolean(detail.data?.bodegas.some((item) => item.bodega_id === warehouseId)),
    ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["producto-canonico", selectedId] });
      setWarehouseOpen(false);
    },
  });
  const saveProviders = useMutation({
    mutationFn: async () => {
      await saveProductoProveedores(selectedId!, "persona", selectedPersonProviders);
      await saveProductoProveedores(selectedId!, "sociedad", selectedCompanyProviders);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["producto-canonico", selectedId] });
      setProvidersOpen(false);
    },
  });

  useEffect(() => {
    if (readAccess === "pendiente" || readAccess === "error") return;
    const createRequested = searchParams.get("accion") === "nuevo";
    const editId = searchParams.get("editar");
    const detailId = searchParams.get("detalle");
    if (createRequested && canCreate) {
      setEditingId(null);
      setFormOpen(true);
    } else if (editId && canUpdate) {
      setEditingId(editId);
      setFormOpen(true);
    } else if (detailId) {
      setSelectedId(detailId);
    }
    if (createRequested || editId || detailId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("accion");
      nextParams.delete("editar");
      nextParams.delete("detalle");
      setSearchParams(nextParams, { replace: true });
    }
  }, [canCreate, canUpdate, readAccess, searchParams, setSearchParams]);

  const productRows = (products.data?.items ?? []).filter((item) =>
    item.nombre.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const columns: Column<ProductoListado>[] = [
    {
      key: "nombre",
      header: "Producto",
      cell: (row) => row.nombre,
      sortable: true,
      sortAccessor: (row) => row.nombre,
    },
    {
      key: "categoria",
      header: "Categoría principal",
      cell: (row) => row.categoria_principal?.nombre ?? "—",
    },
    {
      key: "tipo",
      header: "Tipo",
      cell: (row) => <Badge variant="secondary">{row.tipo === "BIEN" ? "Bien" : "Servicio"}</Badge>,
    },
    { key: "pvp", header: "PVP", cell: (row) => `$ ${Number(row.pvp).toFixed(2)}`, align: "right" },
    { key: "cantidad", header: "Existencia", cell: (row) => row.cantidad, align: "right" },
    {
      key: "acciones",
      header: "Acciones",
      cell: (row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>Ver</Button>
          {canUpdate && <Button size="sm" variant="ghost" onClick={() => { setEditingId(row.id); setFormOpen(true); }}>Editar</Button>}
        </div>
      ),
    },
  ];

  if (permissions.isPending) {
    return <div role="status" className="flex h-64 items-center justify-center">Verificando permisos...</div>;
  }
  if (permissions.isError || readAccess === "error") {
    return <ErrorState message="No se pudieron consultar tus permisos de Producto." onRetry={() => void permissions.refetch()} />;
  }
  if (readAccess !== "permitido") return <Forbidden />;

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo de productos del sistema integrado"
        actions={canCreate ? (
          <Button onClick={() => { setEditingId(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Nuevo producto
          </Button>
        ) : undefined}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto" />
      </div>
      <div className="space-y-2 md:hidden" data-testid="mobile-products">
        {products.isLoading ? (
          <div role="status" className="py-10 text-center text-sm text-muted-foreground">Cargando productos...</div>
        ) : products.isError ? (
          <ErrorState message="No se pudieron cargar los productos." onRetry={() => void products.refetch()} />
        ) : productRows.length === 0 ? (
          <EmptyState
            heading="No hay productos"
            description="Los productos registrados aparecerán aquí."
            action={canCreate ? { label: "Nuevo producto", onClick: () => { setEditingId(null); setFormOpen(true); } } : undefined}
            className="py-10"
          />
        ) : productRows.map((row) => (
          <article key={row.id} className="rounded-md border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{row.nombre}</h2>
                <p className="mt-1 truncate text-xs text-muted-foreground">{row.categoria_principal?.nombre ?? "Sin categoría"}</p>
              </div>
              <Badge variant="secondary">{row.tipo === "BIEN" ? "Bien" : "Servicio"}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">PVP</dt><dd>$ {Number(row.pvp).toFixed(2)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Existencia</dt><dd>{row.cantidad}</dd></div>
            </dl>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>Ver</Button>
              {canUpdate && <Button size="sm" variant="ghost" onClick={() => { setEditingId(row.id); setFormOpen(true); }}>Editar</Button>}
            </div>
          </article>
        ))}
      </div>
      <div className="hidden md:block" data-testid="desktop-products">
        <DataTable
          columns={columns}
          data={productRows}
          rowKey={(row) => row.id}
          isLoading={products.isLoading}
          isError={products.isError}
          onRetry={() => void products.refetch()}
          emptyHeading="No hay productos"
          emptyDescription="Los productos registrados aparecerán aquí."
        />
      </div>

      <ProductoIntegralForm
        open={formOpen}
        productId={editingId}
        onClose={() => setFormOpen(false)}
        onSuccess={(producto) => setSelectedId(producto.id)}
      />

      <DetailModal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={detail.data?.nombre ?? "Producto"}
        loading={detail.isLoading}
        error={detail.isError}
        onRetry={() => void detail.refetch()}
        footer={detail.data ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedId(null)}>Cerrar</Button>
            {canUpdate && <>
              <Button variant="outline" onClick={() => { setSelectedPersonProviders(detail.data!.proveedores_persona.map((item) => item.id)); setSelectedCompanyProviders(detail.data!.proveedores_sociedad.map((item) => item.id)); setProvidersOpen(true); }}>Gestionar proveedores</Button>
              <Button variant="outline" onClick={() => setWarehouseOpen(true)}>Gestionar bodegas</Button>
              <Button onClick={() => { setEditingId(selectedId); setFormOpen(true); }}>Editar</Button>
            </>}
          </div>
        ) : undefined}
        sections={detail.data ? [
          {
            title: "Datos del producto",
            fields: [
              { label: "Tipo", value: detail.data.tipo },
              { label: "PVP", value: `$ ${Number(detail.data.pvp).toFixed(2)}` },
              { label: "Existencia", value: detail.data.cantidad },
              { label: "Categoría principal", value: detail.data.categoria_ruta.map((item) => item.nombre).join(" / ") || "—", full: true },
              { label: "Código de barras", value: detail.data.codigo_barras || "—" },
              { label: "Descripción", value: detail.data.descripcion || "—", full: true },
            ],
          },
          ...(detail.data.atributos.length ? [{ title: "Atributos", fields: detail.data.atributos.map((item) => ({ label: `${item.atributo.nombre}${item.atributo.unidad?.simbolo ? ` (${item.atributo.unidad.simbolo})` : ""}`, value: item.valor ?? "—" })) }] : []),
          ...(detail.data.impuestos.length ? [{ title: "Impuestos", fields: detail.data.impuestos.map((item) => ({ label: item.nombre, value: `${item.porcentaje}% · ${item.codigo}` })) }] : []),
          ...(detail.data.bodegas.length ? [{ title: "Existencias por bodega", fields: detail.data.bodegas.map((item) => ({ label: `${item.codigo_bodega} · ${item.nombre_bodega}`, value: item.cantidad })) }] : []),
          ...(detail.data.proveedores_persona.length ? [{ title: "Proveedores Persona", fields: detail.data.proveedores_persona.map((item) => ({ label: `${item.nombres} ${item.apellidos}`, value: item.nombre_comercial || "—" })) }] : []),
          ...(detail.data.proveedores_sociedad.length ? [{ title: "Proveedores Sociedad", fields: detail.data.proveedores_sociedad.map((item) => ({ label: item.razon_social, value: item.nombre_comercial || "—" })) }] : []),
        ] : []}
      />

      {detail.data && (
        <DetailModal
          open={providersOpen}
          onClose={() => setProvidersOpen(false)}
          title={`Proveedores de ${detail.data.nombre}`}
          subtitle="Administra por separado proveedores persona y proveedores sociedad."
          footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setProvidersOpen(false)}>Cancelar</Button><Button onClick={() => saveProviders.mutate()} disabled={saveProviders.isPending}>{saveProviders.isPending ? "Guardando..." : "Guardar"}</Button></div>}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div><h3 className="mb-2 text-sm font-semibold">Proveedor Persona</h3>{(personProviders.data ?? []).map((item) => <label key={item.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={selectedPersonProviders.includes(item.id)} onChange={(event) => setSelectedPersonProviders(event.target.checked ? [...selectedPersonProviders, item.id] : selectedPersonProviders.filter((id) => id !== item.id))} />{item.nombre_comercial || item.persona_id}</label>)}</div>
            <div><h3 className="mb-2 text-sm font-semibold">Proveedor Sociedad</h3>{(companyProviders.data ?? []).map((item) => <label key={item.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={selectedCompanyProviders.includes(item.id)} onChange={(event) => setSelectedCompanyProviders(event.target.checked ? [...selectedCompanyProviders, item.id] : selectedCompanyProviders.filter((id) => id !== item.id))} />{item.razon_social}{item.nombre_comercial ? ` · ${item.nombre_comercial}` : ""}</label>)}</div>
          </div>
        </DetailModal>
      )}

      {detail.data && (
        <DetailModal
          open={warehouseOpen}
          onClose={() => setWarehouseOpen(false)}
          title={`Bodegas de ${detail.data.nombre}`}
          subtitle="Asigna el producto a una bodega o actualiza su existencia."
          footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setWarehouseOpen(false)}>Cancelar</Button><Button onClick={() => saveWarehouse.mutate()} disabled={saveWarehouse.isPending || !warehouseId || Number(warehouseQuantity) < 0}>{saveWarehouse.isPending ? "Guardando..." : "Guardar"}</Button></div>}
        >
          <div className="space-y-4">
            <FormField label="Bodega" required><select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={warehouseId} onChange={(event) => { const id = event.target.value; setWarehouseId(id); setWarehouseQuantity(String(detail.data?.bodegas.find((item) => item.bodega_id === id)?.cantidad ?? 0)); }}><option value="">Selecciona una bodega</option>{(warehouses.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.codigo_bodega} · {item.nombre_bodega}</option>)}</select></FormField>
            <FormField label="Cantidad" required><Input type="number" min="0" step="0.01" value={warehouseQuantity} onChange={(event) => setWarehouseQuantity(event.target.value)} /></FormField>
          </div>
        </DetailModal>
      )}
    </div>
  );
}