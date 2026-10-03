import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AttributeDataType } from '@/types/api'

export interface RemapItem {
  id: string
  product_id: string
  product_name: string
  old_value: string | null
}

export interface RemapGroup {
  attribute_id: string
  attribute_name: string
  target_type: AttributeDataType
  is_required: boolean
  catalog_id: string | null
  allowed_values: string[] | null
  items: RemapItem[]
}

export interface RemapPending {
  total: number
  groups: RemapGroup[]
}

export function usePendingRemap() {
  return useQuery<RemapPending>({
    queryKey: ["attribute-remap", "pending"],
    queryFn: () => api.get<RemapPending>("/atributos/remapeos/pendientes").then((r) => r.data),
    staleTime: 60 * 1000,
  })
}

export function useResolveRemap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignments: { id: string; valor: unknown }[]) =>
      api.post("/atributos/remapeos/resolver", { assignments }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attribute-remap'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
