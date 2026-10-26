import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getDirectoryOpenApi, getEffectivePermissions } from "./directory";

export function useDirectoryAccess() {
  const { user } = useAuth();
  const scope = String(user?.id ?? "anonymous");
  const permissions = useQuery({
    queryKey: ["directory", scope, "permissions"],
    queryFn: () => getEffectivePermissions(scope),
    enabled: !!user,
    retry: false,
  });
  const contract = useQuery({
    queryKey: ["directory", scope, "contract"],
    queryFn: getDirectoryOpenApi,
    enabled: !!user,
    retry: false,
    staleTime: 60_000,
  });
  const can = (
    codigo: string,
    action: "leer" | "crear" | "actualizar" | "eliminar",
  ) =>
    permissions.data?.some(
      (permission) =>
        permission.codigo === codigo && permission[`puede_${action}`],
    ) ?? false;
  return { scope, permissions, contract, can };
}
