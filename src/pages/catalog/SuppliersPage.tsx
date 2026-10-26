import { DirectoryWorkspace } from "@/components/shared/DirectoryWorkspace";

export default function SuppliersPage() {
  return (
    <DirectoryWorkspace
      resources={["proveedores-persona", "proveedores-sociedad"]}
    />
  );
}
