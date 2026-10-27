import { Navigate, Outlet } from "react-router-dom";
import {
  catalogAccess,
  type CatalogOperation,
} from "@/features/categorias/catalog-access";
import { useCatalogPermissions } from "@/features/categorias/useCatalogPermissions";
import Forbidden from "@/pages/Forbidden";

interface CatalogPermissionRouteProps {
  operations: readonly CatalogOperation[];
}

export function CatalogPermissionRoute({
  operations,
}: CatalogPermissionRouteProps) {
  const { context, permissions } = useCatalogPermissions();

  if (permissions.isPending) {
    return (
      <div role="status" className="flex h-screen items-center justify-center">
        Verificando permisos...
      </div>
    );
  }
  if (permissions.isError) return <Forbidden />;

  const allowed = operations.every(
    (operation) => catalogAccess(context, operation) === "permitido",
  );
  return allowed ? <Outlet /> : <Navigate to="/prohibido" replace />;
}