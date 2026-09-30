import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCompra,
  createRetencion,
  getCompras,
  getRetencionSugerida,
  type CompraDesdeProductosInput,
  type RetencionCreateInput,
} from "./api";

export const comprasKeys = {
  all: ["compras-canonicas"] as const,
  list: (onlyActive: boolean) => [...comprasKeys.all, { onlyActive }] as const,
  retentionSuggestion: (compraId: string) =>
    [...comprasKeys.all, "retencion-sugerida", compraId] as const,
};

export function useCompras(onlyActive = false) {
  return useQuery({
    queryKey: comprasKeys.list(onlyActive),
    queryFn: () => getCompras(onlyActive),
  });
}

export function useCreateCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompraDesdeProductosInput) => createCompra(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: comprasKeys.all }),
  });
}

export function useRetencionSugerida(compraId: string) {
  return useQuery({
    queryKey: comprasKeys.retentionSuggestion(compraId),
    queryFn: () => getRetencionSugerida(compraId),
    enabled: Boolean(compraId),
  });
}

export function useCreateRetencion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      compraId,
      input,
    }: {
      compraId: string;
      input: RetencionCreateInput;
    }) => createRetencion(compraId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: comprasKeys.all }),
  });
}