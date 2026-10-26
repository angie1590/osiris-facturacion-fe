import { DirectoryWorkspace } from "@/components/shared/DirectoryWorkspace";

export default function CustomersPage() {
  return <DirectoryWorkspace resources={["clientes", "tipos-cliente"]} />;
}
