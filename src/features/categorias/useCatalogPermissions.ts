import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getEffectivePermissions } from "@/features/personas/directory";
import type { CatalogAccessContext } from "./catalog-access";

export function useCatalogPermissions() {
  const { user } = useAuth();
  const actor = user?.id == null ? null : String(user.id);
  const permissions = useQuery({
    queryKey: ["effective-permissions", actor],
    queryFn: () => getEffectivePermissions(actor!),
    enabled: actor !== null,
  });
  const context: CatalogAccessContext = actor === null
    ? { actor: null, status: "pendiente" }
    : permissions.isError
      ? { actor, status: "error" }
      : permissions.isPending
        ? { actor, status: "pendiente" }
        : {
            actor,
            permissionsActor: actor,
            status: "listo",
            permissions: permissions.data ?? [],
          };

  return { actor, context, permissions };
}