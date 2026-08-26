import { PersonasPage } from "@/features/personas/components/PersonasPage";

export default function ProveedoresPage() {
  return (
    <PersonasPage
      tipo="proveedor"
      title="Proveedores"
      singularLabel="Proveedor"
      description="Gestiona tu catálogo de proveedores"
    />
  );
}
