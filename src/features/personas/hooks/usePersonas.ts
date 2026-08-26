import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPersona,
  getPersonas,
  type PersonaCreateInput,
  type PersonaTipo,
} from "@/features/personas/api";

export function usePersonas(tipo: PersonaTipo) {
  const queryClient = useQueryClient();
  const queryKey = ["personas", tipo];
  const query = useQuery({
    queryKey,
    queryFn: () => getPersonas(tipo),
  });
  const create = useMutation({
    mutationFn: (input: Omit<PersonaCreateInput, "tipo">) =>
      createPersona({ ...input, tipo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { ...query, create };
}
