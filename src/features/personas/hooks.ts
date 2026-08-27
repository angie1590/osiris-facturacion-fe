import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCliente,
  createProveedorPersona,
  createProveedorSociedad,
  createPersona,
  getPersonas,
  getClientes,
  getProveedoresPersona,
  getProveedoresSociedad,
  getTiposCliente,
  getTiposContribuyente,
  type PersonaCreateInput,
  type ProveedorSociedadInput,
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

export function useTiposContribuyente() {
  return useQuery({ queryKey: ["tipos-contribuyente"], queryFn: getTiposContribuyente });
}

export function useClientes() {
  return useQuery({ queryKey: ["clientes"], queryFn: getClientes });
}

export function useProveedoresPersona() {
  return useQuery({ queryKey: ["proveedores-persona"], queryFn: getProveedoresPersona });
}

export function useProveedoresSociedad() {
  return useQuery({ queryKey: ["proveedores-sociedad"], queryFn: getProveedoresSociedad });
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

export function useCreateProveedorSociedad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProveedorSociedadInput) => createProveedorSociedad(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proveedores-sociedad"] }),
  });
}
