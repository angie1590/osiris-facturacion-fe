import { DirectoryWorkspace } from "@/components/shared/DirectoryWorkspace";

export default function PersonasPage() {
  return (
    <DirectoryWorkspace
      resources={[
        "personas",
        "clientes",
        "proveedores-persona",
        "proveedores-sociedad",
        "tipos-cliente",
      ]}
    />
  );
}
