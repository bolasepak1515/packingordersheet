import { useCallback, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from './queryKeys'
import { fetchJobOrders } from '@/lib/api'
import { insertPackingTrans, updatePackingTrans } from '@/lib/db'
import type { JobOrder, PackingOrderTrans } from '@/types'

// Background auto-sync every 30 minutes keeps the table current while the app
// is open. Sync Data is the primary path for instant freshness.
const AUTO_REFRESH_MS = 30 * 60 * 1000

/**
 * Loads the full Job Order Summary BAQ result through TanStack Query so it
 * participates in the IndexedDB persister. After the first load, an F5 paints
 * the cached rows instantly (no blank table, no full re-download) while a
 * background refetch (refetchOnMount:'always') pulls the latest Epicor result
 * and swaps it in when it arrives. Sync Data re-issues the identical request.
 * Concurrent fetches (mount + Sync + auto-sync) are deduped by React Query, so
 * a dev StrictMode remount no longer triggers a second full download.
 */
export function useJobOrders() {
  const query = useQuery<JobOrder[], Error>({
    queryKey: queryKeys.jobOrders.all,
    queryFn: () => fetchJobOrders(),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: 'always',
  })

  const refetch = useCallback(async () => {
    try {
      await query.refetch()
    } catch {
      // Failures surface through `error`; never reject to callers so the
      // Sync Data button's .finally() always runs.
    }
  }, [query])

  useEffect(() => {
    const id = window.setInterval(() => void refetch(), AUTO_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [refetch])

  return {
    data: query.data,
    // True only while the FIRST result is still loading (blank table state).
    isLoading: query.isPending && query.isFetching,
    isFetching: query.isFetching,
    // "Syncing data (N loaded)..." — rows already on screen while a refresh is
    // in flight (mount revalidation, 30-min auto-sync, or Sync Data).
    isSyncing: query.isFetching && !!query.data,
    syncedCount: query.data?.length ?? 0,
    error: query.error,
    // Sync Data re-calls the exact same fetch used on mount — no "force" mode.
    refetch,
  }
}

export type SavePackingTransVars =
  | { mode: 'insert'; payload: Partial<PackingOrderTrans> }
  | { mode: 'update'; jobNum: string; part: string; payload: Partial<PackingOrderTrans> }

export function useSavePackingTrans(options?: { invalidateOnSuccess?: boolean }) {
  const invalidateOnSuccess = options?.invalidateOnSuccess ?? true
  return useMutation<void, Error, SavePackingTransVars>({
    mutationFn: (vars) =>
      vars.mode === 'insert'
        ? insertPackingTrans(vars.payload)
        : updatePackingTrans(vars.jobNum, vars.part, vars.payload),
    onSuccess: () => {
      if (invalidateOnSuccess) void queryClient.invalidateQueries({ queryKey: queryKeys.packingTrans.all })
    },
  })
}
