import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPlantCodes,
  fetchSizes,
  fetchPackingTrans,
  fetchPlantLookup,
  fetchSizeLookup,
  fetchLoginUsers,
  fetchTagTemplate,
  fetchPackingSheetTemplate,
  createPlantCode,
  updatePlantCode,
  deletePlantCode,
  createSize,
  updateSize,
  deleteSize,
  createLoginUser,
  updateLoginUser,
  deleteLoginUser,
  saveTagTemplate,
  savePackingSheetTemplate,
  type TagTemplateRow,
} from '@/lib/db'
import { fetchJobOrders } from '@/lib/api'
import { queryKeys } from './queryKeys'
import { JOB_ORDERS_DEFAULT_TOP } from './useJobOrders'
import type { PlantCode, Size, LoginRow, PackingOrderTrans } from '@/types'
import type { TagElement } from '@/components/tagbuilder/types'

export type { TagTemplateRow }
export type PackingTransRow = Pick<PackingOrderTrans, 'job_num' | 'part' | 'cartonlot' | 'startpallet' | 'endpallet' | 'carton_number'>

export function usePlantCodes() {
  return useQuery<PlantCode[], Error>({
    queryKey: queryKeys.plantCodes.all,
    queryFn: () => fetchPlantCodes(),
  })
}

export function useSizes() {
  return useQuery<Size[], Error>({
    queryKey: queryKeys.sizes.all,
    queryFn: () => fetchSizes(),
  })
}

export function usePackingTrans() {
  return useQuery<PackingTransRow[], Error>({
    queryKey: queryKeys.packingTrans.all,
    queryFn: () => fetchPackingTrans(),
  })
}

export function usePlantLookup() {
  return useQuery({
    queryKey: queryKeys.plantCodes.lookup,
    queryFn: () => fetchPlantLookup(),
  })
}

export function useSizeLookup() {
  return useQuery({
    queryKey: queryKeys.sizes.lookup,
    queryFn: () => fetchSizeLookup(),
  })
}

export function useLoginUsers() {
  return useQuery<LoginRow[], Error>({
    queryKey: queryKeys.loginUsers.all,
    queryFn: () => fetchLoginUsers(),
  })
}

export function useTagTemplate() {
  return useQuery<TagTemplateRow | null, Error>({
    queryKey: queryKeys.templates.tag,
    queryFn: () => fetchTagTemplate(),
  })
}

export function usePackingSheetTemplate() {
  return useQuery<TagTemplateRow | null, Error>({
    queryKey: queryKeys.templates.packingSheet,
    queryFn: () => fetchPackingSheetTemplate(),
  })
}

// ── Mutations: Plant Codes ──
export function useCreatePlantCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<PlantCode>) => createPlantCode(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plantCodes.all })
    },
  })
}

export function useUpdatePlantCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; payload: Partial<PlantCode> }) => updatePlantCode(vars.id, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plantCodes.all })
    },
  })
}

export function useDeletePlantCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePlantCode(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plantCodes.all })
    },
  })
}

// ── Mutations: Sizes ──
export function useCreateSize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Size>) => createSize(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sizes.all })
    },
  })
}

export function useUpdateSize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; payload: Partial<Size> }) => updateSize(vars.id, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sizes.all })
    },
  })
}

export function useDeleteSize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteSize(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sizes.all })
    },
  })
}

// ── Mutations: Login Users ──
export function useCreateLoginUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<LoginRow>) => createLoginUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers.all })
    },
  })
}

export function useUpdateLoginUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; payload: Partial<LoginRow> }) => updateLoginUser(vars.id, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers.all })
    },
  })
}

export function useDeleteLoginUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteLoginUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers.all })
    },
  })
}

// ── Mutations: Templates ──
export function useSaveTagTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { elements: TagElement[]; canvasWidth: number; canvasHeight: number; updatedBy?: string }) =>
      saveTagTemplate(vars.elements, vars.canvasWidth, vars.canvasHeight, vars.updatedBy),
    onSuccess: (saved: TagTemplateRow) => {
      queryClient.setQueryData(queryKeys.templates.tag, saved)
    },
  })
}

export function useSavePackingSheetTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { elements: TagElement[]; canvasWidth: number; canvasHeight: number; updatedBy?: string }) =>
      savePackingSheetTemplate(vars.elements, vars.canvasWidth, vars.canvasHeight, vars.updatedBy),
    onSuccess: (saved: TagTemplateRow) => {
      queryClient.setQueryData(queryKeys.templates.packingSheet, saved)
    },
  })
}

/** Hook to prefetch all master data on app initialization/layout mount */
export function usePrefetchMasterData() {
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: queryKeys.jobOrders.list('', JOB_ORDERS_DEFAULT_TOP), queryFn: () => fetchJobOrders({ top: JOB_ORDERS_DEFAULT_TOP }) })
    queryClient.prefetchQuery({ queryKey: queryKeys.plantCodes.all, queryFn: () => fetchPlantCodes() })
    queryClient.prefetchQuery({ queryKey: queryKeys.sizes.all, queryFn: () => fetchSizes() })
    queryClient.prefetchQuery({ queryKey: queryKeys.packingTrans.all, queryFn: () => fetchPackingTrans() })
    queryClient.prefetchQuery({ queryKey: queryKeys.templates.tag, queryFn: () => fetchTagTemplate() })
    queryClient.prefetchQuery({ queryKey: queryKeys.templates.packingSheet, queryFn: () => fetchPackingSheetTemplate() })
  }, [queryClient])
}

/** Prefetch the data a route needs ahead of navigation (sidebar hover/focus) */
export function usePrefetchRouteData() {
  const queryClient = useQueryClient()
  return useCallback(
    (path: string) => {
      switch (path) {
        case '/joborder':
          void queryClient.prefetchQuery({ queryKey: queryKeys.jobOrders.list('', JOB_ORDERS_DEFAULT_TOP), queryFn: () => fetchJobOrders({ top: JOB_ORDERS_DEFAULT_TOP }) })
          void queryClient.prefetchQuery({ queryKey: queryKeys.packingTrans.all, queryFn: () => fetchPackingTrans() })
          break
        case '/plantcode':
          void queryClient.prefetchQuery({ queryKey: queryKeys.plantCodes.all, queryFn: () => fetchPlantCodes() })
          break
        case '/sizes':
          void queryClient.prefetchQuery({ queryKey: queryKeys.sizes.all, queryFn: () => fetchSizes() })
          break
        case '/tagbuilder':
          void queryClient.prefetchQuery({ queryKey: queryKeys.templates.tag, queryFn: () => fetchTagTemplate() })
          void queryClient.prefetchQuery({ queryKey: queryKeys.templates.packingSheet, queryFn: () => fetchPackingSheetTemplate() })
          break
        case '/registeruser':
          void queryClient.prefetchQuery({ queryKey: queryKeys.loginUsers.all, queryFn: () => fetchLoginUsers() })
          break
      }
    },
    [queryClient],
  )
}
