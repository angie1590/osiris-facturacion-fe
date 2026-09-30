import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelVenta,
  createPagoCuentaPorCobrar,
  createVenta,
  emitVenta,
  getCuentasPorCobrar,
  getVenta,
  getVentas,
  type VentaDesdeProductosInput,
  type PagoCuentaPorCobrarInput,
} from "./api";

export const ventasKeys = {
  all: ["ventas-canonicas"] as const,
  detail: (id: string) => [...ventasKeys.all, id] as const,
  receivables: (texto: string) => ["cxc-canonicas", texto] as const,
};

export function useVentas() {
  return useQuery({ queryKey: ventasKeys.all, queryFn: getVentas });
}

export function useVenta(id?: string) {
  return useQuery({
    queryKey: ventasKeys.detail(id ?? ""),
    queryFn: () => getVenta(id!),
    enabled: Boolean(id),
  });
}

export function useCreateVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VentaDesdeProductosInput) => createVenta(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ventasKeys.all }),
  });
}

export function useEmitVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: emitVenta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ventasKeys.all }),
  });
}

export function useCancelVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      cancelVenta(id, motivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ventasKeys.all }),
  });
}

export function useCuentasPorCobrar(texto = "") {
  return useQuery({
    queryKey: ventasKeys.receivables(texto),
    queryFn: () => getCuentasPorCobrar(texto),
  });
}

export function useCreatePagoCuentaPorCobrar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ventaId,
      input,
    }: {
      ventaId: string;
      input: PagoCuentaPorCobrarInput;
    }) => createPagoCuentaPorCobrar(ventaId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["cxc-canonicas"] }),
  });
}