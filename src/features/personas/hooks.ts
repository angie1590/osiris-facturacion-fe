import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPersona,
  getPersonas,
  type PersonaCreateInput,
} from "@/features/personas/api";

export function usePersonas() {
  return useQuery({
    queryKey: ["personas"],
    queryFn: () => getPersonas(),
  });
}

export function useCreatePersona() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PersonaCreateInput) => createPersona(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["personas"] }),
  });
}
