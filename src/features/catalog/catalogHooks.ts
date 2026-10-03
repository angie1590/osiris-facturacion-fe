import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Catalog, CatalogValue } from '@/types/api'

export function useCatalogs() {
  return useQuery({
    queryKey: ["catalogos"],
    queryFn: () => api.get<Catalog[]>("/catalogos").then((r) => r.data),
  })
}

export function useCatalogValues(catalogId: string | null | undefined, includeInactive = true) {
  return useQuery({
    queryKey: ["catalogo-valores", catalogId, includeInactive],
    queryFn: () =>
      api
        .get<CatalogValue[]>(`/catalogos/${catalogId}/valores`, { params: { include_inactive: includeInactive } })
        .then((r) => r.data),
    enabled: catalogId != null,
  })
}

export function useCreateCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      api.post<Catalog>("/catalogos", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos"] }),
  })
}

export function useUpdateCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; description?: string } }) =>
      api.patch<Catalog>(`/catalogos/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos"] }),
  })
}

export function useDeleteCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/catalogos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos"] }),
  })
}

export function useAddCatalogValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ catalogId, value }: { catalogId: string; value: string }) =>
      api.post<CatalogValue>(`/catalogos/${catalogId}/valores`, { value }).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["catalogo-valores", v.catalogId] })
      qc.invalidateQueries({ queryKey: ["catalogos"] })
    },
  })
}

export function useUpdateCatalogValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ catalogId, valueId, value }: { catalogId: string; valueId: string; value: string }) =>
      api.patch<CatalogValue>(`/catalogos/${catalogId}/valores/${valueId}`, { value }).then((r) => r.data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["catalogo-valores", v.catalogId] }),
  })
}

export function useToggleCatalogValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ catalogId, valueId, active }: { catalogId: string; valueId: string; active: boolean }) =>
      api
        .post<CatalogValue>(`/catalogos/${catalogId}/valores/${valueId}/${active ? "reactivate" : "deactivate"}`)
        .then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["catalogo-valores", v.catalogId] })
      qc.invalidateQueries({ queryKey: ["catalogos"] })
    },
  })
}
