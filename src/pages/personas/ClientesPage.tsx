import { PersonasPage } from "@/features/personas/components/PersonasPage";

export default function ClientesPage() {
  return (
    <PersonasPage
      tipo="cliente"
      title="Clientes"
      singularLabel="Cliente"
      description="Gestiona tu catálogo de clientes"
    />
  );
}
