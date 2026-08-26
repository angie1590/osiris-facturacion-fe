import { Contact, GitBranch, Truck } from "lucide-react";
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
      <div className="mb-6 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GitBranch className="h-4 w-4 text-primary" />
          <span>Persona</span>
          <span className="text-muted-foreground">· datos comunes</span>
        </div>
        <div className="mt-3 grid gap-3 pl-6 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Contact className="h-4 w-4 text-primary" />
              Cliente
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Especialización comercial</p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-primary" />
              Proveedor
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Especialización de compras</p>
          </div>
        </div>
      </div>
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
