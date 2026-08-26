import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCliente,
  createProveedorPersona,
  createPersona,
  getPersonas,
  getTiposCliente,
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

export function useTiposCliente() {
  return useQuery({
    queryKey: ["tipos-cliente"],
    queryFn: getTiposCliente,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personaId, tipoClienteId }: { personaId: string; tipoClienteId: string }) =>
      createCliente(personaId, tipoClienteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

export function useCreateProveedorPersona() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personaId, tipoContribuyenteId, nombreComercial }: { personaId: string; tipoContribuyenteId: string; nombreComercial?: string }) =>
      createProveedorPersona(personaId, tipoContribuyenteId, nombreComercial),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proveedores-persona"] }),
  });
}
