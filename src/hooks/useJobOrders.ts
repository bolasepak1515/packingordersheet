import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from './queryKeys'
import { fetchJobOrders } from '@/lib/api'
import { insertPackingTrans, updatePackingTrans } from '@/lib/db'
import type { JobOrder, PackingOrderTrans } from '@/types'

export const JOB_ORDERS_DEFAULT_TOP = 500

export function useJobOrders(search = '', top: number | null = JOB_ORDERS_DEFAULT_TOP) {
  return useQuery<JobOrder[], Error>({
    queryKey: queryKeys.jobOrders.list(search, top),
    queryFn: () => fetchJobOrders({ search: search || undefined, top }),
    placeholderData: keepPreviousData,
  })
}

/** Read cached data outside React hooks — shared with PDF generator */
export function getCachedJobOrders(search = '', top: number | null = JOB_ORDERS_DEFAULT_TOP): JobOrder[] | undefined {
  return queryClient.getQueryData<JobOrder[]>(queryKeys.jobOrders.list(search, top))
}

export type SavePackingTransVars =
  | { mode: 'insert'; payload: Partial<PackingOrderTrans> }
  | { mode: 'update'; jobNum: string; part: string; payload: Partial<PackingOrderTrans> }

export function useSavePackingTrans() {
  return useMutation<void, Error, SavePackingTransVars>({
    mutationFn: (vars) =>
      vars.mode === 'insert'
        ? insertPackingTrans(vars.payload)
        : updatePackingTrans(vars.jobNum, vars.part, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.packingTrans.all })
    },
  })
}
