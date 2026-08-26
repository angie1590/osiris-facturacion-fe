import { Contact, Truck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonasPage as PersonasList } from "@/features/personas/components/PersonasPage";

export default function PersonasPage() {
  return (
    <div>
      <PageHeader
        title="Personas"
        description="Administra clientes y proveedores de tu empresa"
      />
      <Tabs defaultValue="clientes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clientes">
            <Contact className="mr-2 h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="proveedores">
            <Truck className="mr-2 h-4 w-4" />
            Proveedores
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clientes">
          <PersonasList
            tipo="cliente"
            title="Clientes"
            singularLabel="Cliente"
            description="Gestiona tu catálogo de clientes"
            showHeader={false}
          />
        </TabsContent>
        <TabsContent value="proveedores">
          <PersonasList
            tipo="proveedor"
            title="Proveedores"
            singularLabel="Proveedor"
            description="Gestiona tu catálogo de proveedores"
            showHeader={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
