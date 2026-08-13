import { useState, useEffect, useMemo, useCallback, useDeferredValue, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/hooks/queryKeys'
import { useJobOrders, useSavePackingTrans } from '@/hooks/useJobOrders'
import { fetchPackingMaterials, fetchJobOrders, fetchJobOrderByNum, isNum } from '@/lib/api'
import { usePlantCodes, useSizes, usePackingTrans } from '@/hooks/useMasterData'
import { validateJobOrderLine, calculateLinePreviewData, isPackingSheetReady } from '@/utils/batchValidation'
import type { BatchLineStatus, LinePreviewData } from '@/utils/batchValidation'
import { useAuth } from '@/contexts/AuthContext'
import Message from '@/components/Message'
import Button from '@/components/Button'
import JobOrderParentTable from '@/components/JobOrderParentTable'
import JobOrderLinesModal from '@/components/JobOrderLinesModal'
import PackingSheetOptionsModal from '@/components/PackingSheetOptionsModal'
import BatchProgressModal from '@/components/BatchProgressModal'
import type { ParentOrder } from '@/components/JobOrderParentTable'
import JobOrderDetailModal from '@/components/JobOrderDetailModal'
import JobOrderEditModal from '@/components/JobOrderEditModal'
import CartonLotPreviewModal from '@/components/CartonLotPreviewModal'
import type { JobOrder, PalletInfo, FlashMessage } from '@/types'
import type { CartonLotPreviewData } from '@/components/CartonLotPreviewModal'

export type { JobOrder }

export default function JobOrderPage() {
  const { user } = useAuth()
  const { data, isLoading, isFetching, error: queryErr, refetch } = useJobOrders()
  const { data: plantLookup = [] } = usePlantCodes()
  const { data: sizeLookup = [] } = useSizes()
  const { data: packingTrans = [], refetch: refetchPackingTrans } = usePackingTrans()
  const savePackingTrans = useSavePackingTrans()
  const batchSavePackingTrans = useSavePackingTrans({ invalidateOnSuccess: false })
  // Sync-button feedback only. Background revalidations (F5 mount refetch, the
  // 30-minute auto-sync, route prefetch) never spin this button — their
  // progress is shown by the "Syncing data" pill so the page doesn't sit in a
  // perpetual loading state.
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<FlashMessage | null>(null)
  // What the in-flight Sync Data button is doing: 'all' = full BAQ refresh,
  // 'search' = targeted sync of matching rows, number = targeted Order Num sync.
  // Used only for the button label.
  const [syncTarget, setSyncTarget] = useState<'all' | 'search' | number | null>(null)

  // "Updated HH:MM:SS" — proves a refresh actually ran and finished. If this
  // timestamp advances but the data still looks old, the stale copy is coming
  // from Epicor's BAQ results cache, not from this app.
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const prevFetchingRef = useRef(false)
  useEffect(() => {
    if (prevFetchingRef.current && !isFetching && data) setLastUpdated(new Date())
    prevFetchingRef.current = isFetching
  }, [isFetching, data])
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [parentShowFilters, setParentShowFilters] = useState(false)
  const [parentColumnFilters, setParentColumnFilters] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState<Record<string, boolean>>({})
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<JobOrder | null>(null)
  const [editRow, setEditRow] = useState<JobOrder | null>(null)
  const [editValues, setEditValues] = useState({ startpallet: 0, endpallet: 0, cartonlot: '', cartonNumber: '' })
  const [previewRow, setPreviewRow] = useState<JobOrder | null>(null)
  const [previewData, setPreviewData] = useState<CartonLotPreviewData | null>(null)
  const [creatingPreview, setCreatingPreview] = useState(false)
  const [parentOpen, setParentOpen] = useState<{ company: string; orderNum: number } | null>(null)
  const [packingSheetRows, setPackingSheetRows] = useState<JobOrder[] | null>(null)

  const [batchState, setBatchState] = useState<{ company: string; orderNum: number; lines: JobOrder[] } | null>(null)
  const [batchPlantFilter, setBatchPlantFilter] = useState('')
  const [batchStatus, setBatchStatus] = useState<Record<string, BatchLineStatus>>({})
  const [batchReasons, setBatchReasons] = useState<Record<string, string>>({})
  const [batchDetails, setBatchDetails] = useState<Record<string, LinePreviewData>>({})
  const [batchRunning, setBatchRunning] = useState(false)

  // Keep typing smooth: filtering lags slightly behind keystrokes while the
  // deferred value (and thus the filtered dataset) catches up. Search is
  // client-side on the loaded dataset, so results appear instantly.
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    if (queryErr) setError(queryErr instanceof Error ? queryErr.message : 'Unknown error')
  }, [queryErr])

  const plantMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of plantLookup) {
      if (p.plant_name) m[p.plant_name] = p.plant_code
    }
    return m
  }, [plantLookup])

  const sizeMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of sizeLookup) m[s.size_name] = String(s.size_code)
    return m
  }, [sizeLookup])

  const runningPalletMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of plantLookup) {
      if (p.plant_name) m[p.plant_name] = parseInt(p.running_pallet ?? '') || 0
    }
    return m
  }, [plantLookup])

  const { cartonLots, palletData, cartonNums } = useMemo(() => {
    const cl: Record<string, string> = {}
    const pd: Record<string, PalletInfo> = {}
    const cn: Record<string, string> = {}
    for (const t of packingTrans) {
      const k = `${t.job_num}|${t.part}`
      cl[k] = t.cartonlot
      if (t.startpallet != null && t.endpallet != null)
        pd[k] = { startpallet: t.startpallet, endpallet: t.endpallet }
      if (t.carton_number) cn[k] = t.carton_number
    }
    return { cartonLots: cl, palletData: pd, cartonNums: cn }
  }, [packingTrans])

  // Sync Data ALWAYS issues a fresh request to the Epicor BAQ (via the Vercel
  // proxy in production) AND re-pulls the internal lots from Supabase, so a
  // second user's recent create/update shows up. It is never a re-filter or a
  // cache reload. Existing rows stay visible while the new datasets load, so
  // the page never blanks during a sync.
  //
  // What gets synced depends on the search bar:
  //  - EMPTY search          -> full BAQ refresh (everything).
  //  - bare numeric search   -> TARGETED sync of just that Order Num (the
  //    $filter is pushed down to SQL in Epicor — seconds, not the 30-48s
  //    full-BAQ compute). The order's stale rows are replaced by the fresh
  //    result, and if Epicor no longer returns it, the order is removed.
  //  - any other search text -> TARGETED sync of just the matching rows (the
  //    same server-side $filter used for search), merged into the cache.
  async function syncFull() {
    setError(null)
    setSyncTarget('all')
    setManualRefreshing(true)
    try {
      await Promise.allSettled([refetch(), refetchPackingTrans()])
      setSyncMsg({ text: 'Synced all job orders', type: 'success' })
    } finally {
      setManualRefreshing(false)
    }
  }

  // Uniquely identifies a BAQ result row. The Summary BAQ type doesn't expose a
  // release field, so Order Num + Order Line is the row identity available here.
  const rowKey = (d: JobOrder) => `${d.OrderHed_OrderNum}|${d.OrderDtl_OrderLine}`

  async function syncOrder(orderNum: number) {
    setError(null)
    setSyncTarget(orderNum)
    setManualRefreshing(true)
    try {
      let rows: JobOrder[]
      try {
        rows = await fetchJobOrderByNum(orderNum)
      } catch (err: unknown) {
        setError('Sync failed: ' + (err instanceof Error ? err.message : String(err)))
        return
      }
      // Merge into the existing cache instead of replacing the whole dataset:
      // drop the target order's stale rows (the fresh result replaces them),
      // append the fresh result (updates lines in place / adds a genuinely-new
      // order), and keep every other order's rows untouched. If Epicor returns
      // zero rows, the drop above removes the order from the cache entirely.
      const prev = queryClient.getQueryData<JobOrder[]>(queryKeys.jobOrders.all) ?? []
      const merged = [
        ...prev.filter((d) => d.OrderHed_OrderNum !== orderNum),
        ...rows,
      ].sort((a, b) => b.OrderHed_OrderNum - a.OrderHed_OrderNum || a.OrderDtl_OrderLine - b.OrderDtl_OrderLine)
      queryClient.setQueryData(queryKeys.jobOrders.all, merged)
      setSyncMsg(rows.length === 0
        ? { text: `Order #${orderNum} removed — no longer in BAQ`, type: 'warning' }
        : { text: `Synced Order #${orderNum}`, type: 'success' })
      await refetchPackingTrans()
    } finally {
      setManualRefreshing(false)
    }
  }

  async function syncSearch(term: string) {
    setError(null)
    setSyncTarget('search')
    setManualRefreshing(true)
    try {
      let rows: JobOrder[]
      try {
        rows = await fetchJobOrders(term)
      } catch (err: unknown) {
        setError('Sync failed: ' + (err instanceof Error ? err.message : String(err)))
        return
      }
      // Merge only the matching rows into the cache: rows Epicor re-supplies are
      // updated in place, genuinely-new rows append, everything else is kept.
      const prev = queryClient.getQueryData<JobOrder[]>(queryKeys.jobOrders.all) ?? []
      const incoming = new Map(rows.map((r) => [rowKey(r), r]))
      const merged = [
        ...prev.filter((d) => !incoming.has(rowKey(d))),
        ...rows,
      ].sort((a, b) => b.OrderHed_OrderNum - a.OrderHed_OrderNum || a.OrderDtl_OrderLine - b.OrderDtl_OrderLine)
      queryClient.setQueryData(queryKeys.jobOrders.all, merged)
      setSyncMsg(rows.length === 0
        ? { text: `No rows match "${term}" in BAQ`, type: 'warning' }
        : { text: `Synced ${rows.length} matching row${rows.length === 1 ? '' : 's'}`, type: 'success' })
      await refetchPackingTrans()
    } finally {
      setManualRefreshing(false)
    }
  }

  function fetchData() {
    const q = search.trim()
    if (!q) void syncFull()
    else if (isNum(q)) void syncOrder(Number(q))
    else void syncSearch(q)
  }

  const filterAccessors: Record<string, (d: JobOrder) => string> = useMemo(() => ({
    OrderCompany: (d) => d.OrderHed_Company,
    OrderLine: (d) => `${String(d.OrderHed_OrderNum).padStart(9, '0')}-${String(d.OrderDtl_OrderLine).padStart(2, '0')}`,
    PartNumber: (d) => d.OrderDtl_PartNum,
    QtyInner: (d) => String(d.OrderDtl_FS_PcsPerBox_c ?? ''),
    QtyCarton: (d) => String(d.OrderDtl_FS_BoxPerCarton_c ?? ''),
    TotalCTN: (d) => String(d.Calculated_Total_CTN ?? ''),
    Plant: (d) => d.JobHead_Plant,
    PlantPacking: (d) => d.Calculated_PlantPacking ?? '',
    JobNum: (d) => d.JobHead_JobNum,
    InternalLot: (d) => {
      const k = `${d.JobHead_JobNum}|${d.OrderDtl_PartNum}`
      const lot = cartonLots[k] ?? ''
      return lot
    },
  }), [cartonLots])

  const matchesSearch = useCallback((d: JobOrder): boolean => {
    const q = deferredSearch.toLowerCase()
    return (
      !q ||
      (d.OrderHed_PONum ?? '').toLowerCase().includes(q) ||
      (d.OrderDtl_PartNum ?? '').toLowerCase().includes(q) ||
      (d.OrderDtl_LineDesc ?? '').toLowerCase().includes(q) ||
      (d.JobHead_Plant ?? '').toLowerCase().includes(q) ||
      (d.JobHead_JobNum ?? '').toLowerCase().includes(q) ||
      (d.OrderHed_Company ?? '').toLowerCase().includes(q) ||
      String(d.OrderHed_OrderNum ?? '').includes(q) ||
      `${String(d.OrderHed_OrderNum).padStart(9, '0')}-${String(d.OrderDtl_OrderLine).padStart(2, '0')}`.includes(q) ||
      (d.OrderDtl_FS_LotNumber_c ?? '').toLowerCase().includes(q) ||
      (cartonLots[`${d.JobHead_JobNum}|${d.OrderDtl_PartNum}`] ?? '').toLowerCase().includes(q)
    )
  }, [deferredSearch, cartonLots])

  const runPackingSheet = useCallback((orderRows: JobOrder[], opts: { site?: string; companyName?: string }) => {
    import('@/utils/generatePackingSheetPdf')
      .then((m) => m.generatePackingSheetPdf(orderRows, opts))
      .catch((err: unknown) => alert('Packing sheet failed: ' + (err instanceof Error ? err.message : String(err))))
  }, [])

  const handlePackingSheetClick = useCallback((orderRows: JobOrder[]) => {
    if (user && user.role === 'admin') {
      setPackingSheetRows(orderRows)
    } else {
      runPackingSheet(orderRows, { site: user?.site ?? '', companyName: user?.companyname ?? '' })
    }
  }, [runPackingSheet, user])

  const handleParentFilterChange = useCallback((key: string, val: string) => {
    setParentColumnFilters((p) => ({ ...p, [key]: val }))
  }, [])

  const handleParentToggleFilters = useCallback(() => {
    if (parentShowFilters) setParentColumnFilters({})
    setParentShowFilters((s) => !s)
  }, [parentShowFilters])

  const handleParentClearFilters = useCallback(() => {
    setParentColumnFilters({})
  }, [])

  const handleParentRowClick = useCallback((p: ParentOrder) => {
    setParentOpen({ company: p.company, orderNum: p.orderNum })
  }, [])

  const handleParentPackingSheet = useCallback((p: ParentOrder) => {
    const rows = (data ?? []).filter((d) => d.OrderHed_Company === p.company && d.OrderHed_OrderNum === p.orderNum)
    if (rows.length === 0) return
    handlePackingSheetClick(rows)
  }, [data, handlePackingSheetClick])

  const parentBase = useMemo(() => (data ?? []).filter(matchesSearch), [data, matchesSearch])

  const filtered = useMemo(() =>
    parentBase.filter((d) =>
      Object.entries(columnFilters).every(([col, val]) =>
        !val || !filterAccessors[col] || (filterAccessors[col](d) ?? '').toLowerCase().includes(val.toLowerCase()),
      ),
    ),
  [parentBase, columnFilters, filterAccessors])

  const parentFilterAccessors: Record<string, (p: ParentOrder) => string> = useMemo(() => ({
    OrderCompany: (p) => p.company,
    OrderNum: (p) => String(p.orderNum).padStart(9, '0'),
    OrderDate: (p) => p.orderDate,
    NeedBy: (p) => p.needBy,
    GRef: (p) => p.poNum,
    TotalCtn: (p) => String(p.totalCtn ?? ''),
    PlantPacking: (p) => p.plantPacking.map((pp) => pp.code).join(' '),
  }), [])

  const parentRows = useMemo<ParentOrder[]>(() => {
    type Group = ParentOrder & { ppCounts: Map<string, number>; ppCreated: Map<string, number> }
    const map = new Map<string, Group>()
    for (const d of parentBase) {
      const key = `${d.OrderHed_Company}|${d.OrderHed_OrderNum}`
      let g = map.get(key)
      if (!g) {
        g = { company: d.OrderHed_Company, orderNum: d.OrderHed_OrderNum, orderDate: '', needBy: '', poNum: '', lineCount: 0, createdCount: 0, notAssignSiteCount: 0, noJobCount: 0, totalCtn: 0, packingReady: true, plantPacking: [], ppCounts: new Map(), ppCreated: new Map() }
        map.set(key, g)
      }
      g.lineCount++
      if (!d.JobHead_JobNum) g.noJobCount++
      if (!isPackingSheetReady(d, cartonLots)) g.packingReady = false
      if (cartonLots[`${d.JobHead_JobNum}|${d.OrderDtl_PartNum}`]) g.createdCount++
      if (!g.orderDate && d.OrderHed_OrderDate) g.orderDate = d.OrderHed_OrderDate
      if (!g.needBy && d.OrderDtl_NeedByDate) g.needBy = d.OrderDtl_NeedByDate
      if (!g.poNum && d.OrderHed_PONum) g.poNum = d.OrderHed_PONum
      g.totalCtn += d.Calculated_Total_CTN ?? 0
      const pp = d.Calculated_PlantPacking
      if (pp) {
        const ppKey = pp.toLowerCase()
        g.ppCounts.set(ppKey, (g.ppCounts.get(ppKey) ?? 0) + 1)
        if (cartonLots[`${d.JobHead_JobNum}|${d.OrderDtl_PartNum}`]) g.ppCreated.set(ppKey, (g.ppCreated.get(ppKey) ?? 0) + 1)
        if (ppKey === 'mfgsys') g.notAssignSiteCount++
      }
    }
    return Array.from(map.values())
      .map(({ ppCounts, ppCreated, ...rest }) => ({
        ...rest,
        plantPacking: Array.from(ppCounts.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([pp, n]) => {
            const created = ppCreated.get(pp) ?? 0
            return { code: pp, count: n, created, pending: n - created }
          }),
      }))
      .filter((p) =>
        Object.entries(parentColumnFilters).every(([col, val]) =>
          !val || !parentFilterAccessors[col] || (parentFilterAccessors[col](p) ?? '').toLowerCase().includes(val.toLowerCase()),
        ),
      )
      .sort((a, b) => a.orderNum - b.orderNum)
  }, [parentBase, parentColumnFilters, parentFilterAccessors, cartonLots])

  const parentChildren = useMemo(() => {
    if (!parentOpen) return []
    return filtered.filter(
      (d) => d.OrderHed_Company === parentOpen.company && d.OrderHed_OrderNum === parentOpen.orderNum,
    )
  }, [filtered, parentOpen])

  async function handleUpdate(row: JobOrder) {
    const key = `${row.JobHead_JobNum}|${row.OrderDtl_PartNum}`
    setCreating((prev) => ({ ...prev, [key]: true }))

    try {
      await savePackingTrans.mutateAsync({
        mode: 'update',
        jobNum: row.JobHead_JobNum,
        part: row.OrderDtl_PartNum,
        payload: {
          startpallet: editValues.startpallet,
          endpallet: editValues.endpallet,
          cartonlot: editValues.cartonlot,
          carton_number: editValues.cartonNumber,
        },
      })

      const { error: pcUpdErr } = await supabase
        .from('plantcode').update({ running_pallet: String(editValues.endpallet) }).eq('plant_name', row.JobHead_Plant)
      if (pcUpdErr) { setCreating((prev) => ({ ...prev, [key]: false })); alert('plantcode update failed: ' + pcUpdErr.message); return }

      setEditRow(null)
      setSuccessMsg(`Carton Lot updated for ${row.JobHead_JobNum}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: unknown) {
      alert('update failed: ' + (err instanceof Error ? err.message : String(err)))
    }
    setCreating((prev) => ({ ...prev, [key]: false }))
  }

  const handleAction = useCallback((row: JobOrder) => {
    if (user && user.role !== 'admin' && user.site !== row.JobHead_Plant) {
      alert('Access Denied: You are only allowed to manage records for your assigned site.')
      return
    }
    const k = `${row.JobHead_JobNum}|${row.OrderDtl_PartNum}`
    if (cartonLots[k]) {
      setEditRow(row)
      setEditValues({ ...(palletData[k] ?? { startpallet: 0, endpallet: 0 }), cartonlot: cartonLots[k] ?? '', cartonNumber: cartonNums[k] ?? '' })
    } else {
      setCreating((prev) => ({ ...prev, [k]: true }))
      computeAndShowPreview(row, k)
    }
  }, [cartonLots, palletData, cartonNums, plantMap, sizeMap, user])

  async function computeAndShowPreview(row: JobOrder, k: string) {
    const { data: pcData, error: pcErr } = await supabase
      .from('plantcode').select('running_pallet').eq('plant_name', row.JobHead_Plant).single()
    if (pcErr) { alert('plantcode lookup failed: ' + pcErr.message); setCreating((prev) => ({ ...prev, [k]: false })); return }

    const runningPallet = parseInt(pcData?.running_pallet) || 0
    setPreviewData(calculateLinePreviewData(row, { runningPallet, plantMap, sizeMap, allRows: data ?? [] }))
    setPreviewRow(row)
    setCreating((prev) => ({ ...prev, [k]: false }))
  }

  async function handleConfirmCreate() {
    const row = previewRow
    if (!row || !previewData) return
    setCreatingPreview(true)
    try {
      await savePackingTrans.mutateAsync({
        mode: 'insert',
        payload: {
          job_num: row.JobHead_JobNum,
          part: row.OrderDtl_PartNum,
          cartonlot: previewData.lotId,
          startpallet: previewData.pages > 0 ? previewData.startPallet : null,
          endpallet: previewData.pages > 0 ? previewData.endPallet : null,
          carton_number: previewData.cartonNumber,
        },
      })
      if (previewData.pages > 0) {
        const { error: updErr } = await supabase
          .from('plantcode').update({ running_pallet: String(previewData.endPallet) }).eq('plant_name', row.JobHead_Plant)
        if (updErr) { alert('update plantcode failed: ' + updErr.message); return }
      }
      setSuccessMsg(`Carton Lot created for ${row.JobHead_JobNum}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: unknown) { alert('insert failed: ' + (err instanceof Error ? err.message : String(err))) }
    setCreatingPreview(false)
    setPreviewRow(null)
    setPreviewData(null)
  }

  const handleCreateAll = useCallback((company: string, orderNum: number) => {
    const lines = (data ?? []).filter((d) => d.OrderHed_Company === company && d.OrderHed_OrderNum === orderNum)
    if (lines.length === 0) { alert('No lines found for this order.'); return }
    setBatchState({ company, orderNum, lines })
    setBatchPlantFilter('')
    setBatchStatus({})
    setBatchReasons({})
    setBatchDetails({})
  }, [data])

  const handleBatchPlantFilter = useCallback((val: string) => {
    setBatchPlantFilter(val)
    if (!batchState) return
    const status: Record<string, BatchLineStatus> = {}
    const reasons: Record<string, string> = {}
    for (const line of batchState.lines) {
      const key = `${line.JobHead_JobNum}|${line.OrderDtl_PartNum}`
      const res = validateJobOrderLine(line, { cartonLots, userRole: user?.role, userSite: user?.site, plantFilter: val })
      status[key] = res.status
      reasons[key] = res.reason
    }
    setBatchStatus(status)
    setBatchReasons(reasons)
    setBatchDetails({})
  }, [batchState, cartonLots, user])

  const batchValidated = useMemo(() => {
    if (!batchState) return []
    const runningByPlant: Record<string, number> = { ...runningPalletMap }
    return batchState.lines.map((line) => {
      const key = `${line.JobHead_JobNum}|${line.OrderDtl_PartNum}`
      const live = batchStatus[key]
      const res = live && live !== 'pending'
        ? null
        : validateJobOrderLine(line, { cartonLots, userRole: user?.role, userSite: user?.site, plantFilter: batchPlantFilter })
      const status = live ?? res?.status ?? 'pending'
      const isTarget = status === 'pending' ? !!res?.valid : status === 'creating' || status === 'completed'
      let detail = batchDetails[key]
      if (!detail && isTarget) {
        const plant = line.JobHead_Plant
        detail = calculateLinePreviewData(line, {
          runningPallet: runningByPlant[plant] ?? 0,
          plantMap,
          sizeMap,
          allRows: batchState.lines,
        })
        if (detail.pages > 0) runningByPlant[plant] = detail.endPallet
      } else if (detail && (status === 'creating' || status === 'completed')) {
        const plant = line.JobHead_Plant
        if (detail.pages > 0) runningByPlant[plant] = detail.endPallet
      }
      return {
        key,
        row: line,
        status,
        reason: live === 'skipped' ? (batchReasons[key] ?? '') : res ? res.reason : '',
        detail,
      }
    })
  }, [batchState, batchStatus, batchReasons, batchDetails, batchPlantFilter, cartonLots, user, runningPalletMap, plantMap, sizeMap])

  const availableBatchPlants = useMemo(() => {
    if (!batchState) return []
    const seen = new Set<string>()
    for (const line of batchState.lines) {
      if (line.JobHead_Plant) seen.add(line.JobHead_Plant)
    }
    return Array.from(seen).sort()
  }, [batchState])

  const handleBatchConfirm = async () => {
    if (!batchState || batchRunning) return
    const targets = batchState.lines.filter((line) =>
      validateJobOrderLine(line, { cartonLots, userRole: user?.role, userSite: user?.site, plantFilter: batchPlantFilter }).valid,
    )
    if (targets.length === 0) return

    setBatchRunning(true)
    try {
      // ONE batch read for all unique plants — eliminates N sequential SELECT queries
      const uniquePlants = [...new Set(targets.map((l) => l.JobHead_Plant).filter(Boolean))]
      const { data: pcBatch, error: pcBatchErr } = await supabase
        .from('plantcode')
        .select('plant_name, running_pallet')
        .in('plant_name', uniquePlants)
      if (pcBatchErr) throw new Error('plantcode batch lookup failed: ' + pcBatchErr.message)

      // Local map keeps the running counter current across same-plant lines;
      // updated after each write so sequential lines see the right value.
      const runningByPlant: Record<string, number> = {}
      for (const row of pcBatch ?? []) {
        if (row.plant_name) runningByPlant[row.plant_name] = parseInt(row.running_pallet ?? '') || 0
      }

      for (const line of targets) {
        const key = `${line.JobHead_JobNum}|${line.OrderDtl_PartNum}`
        setBatchStatus((p) => ({ ...p, [key]: 'creating' }))
        setBatchReasons((p) => ({ ...p, [key]: '' }))
        try {
          const preview = calculateLinePreviewData(line, {
            runningPallet: runningByPlant[line.JobHead_Plant] ?? 0,
            plantMap,
            sizeMap,
            allRows: batchState.lines,
          })

          await batchSavePackingTrans.mutateAsync({
            mode: 'insert',
            payload: {
              job_num: line.JobHead_JobNum,
              part: line.OrderDtl_PartNum,
              cartonlot: preview.lotId,
              startpallet: preview.pages > 0 ? preview.startPallet : null,
              endpallet: preview.pages > 0 ? preview.endPallet : null,
              carton_number: preview.cartonNumber,
            },
          })

          if (preview.pages > 0) {
            const { error: updErr } = await supabase
              .from('plantcode').update({ running_pallet: String(preview.endPallet) }).eq('plant_name', line.JobHead_Plant)
            if (updErr) throw new Error('plantcode update failed: ' + updErr.message)
            // Advance local counter so the next line for this plant uses the correct base
            runningByPlant[line.JobHead_Plant] = preview.endPallet
          }

          setBatchDetails((p) => ({ ...p, [key]: preview }))
          setBatchStatus((p) => ({ ...p, [key]: 'completed' }))
        } catch (err: unknown) {
          setBatchStatus((p) => ({ ...p, [key]: 'failed' }))
          setBatchReasons((p) => ({ ...p, [key]: err instanceof Error ? err.message : String(err) }))
        }
      }
    } finally {
      setBatchRunning(false)
      void queryClient.invalidateQueries({ queryKey: queryKeys.packingTrans.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.plantCodes.all })
    }
  }

  const handleBatchClose = () => {
    if (batchRunning) return
    setBatchState(null)
    setBatchPlantFilter('')
    setBatchStatus({})
    setBatchReasons({})
    setBatchDetails({})
  }

  // Packaging Material is fetched ON-DEMAND, only when generating the PDF. The
  // MTL API (VITE_API_URL2) is never hit during page load, refresh, search,
  // sorting or pagination. If the lookup fails we alert but still print the PDF
  // (the {packagingMaterial} token renders "-") — the page/table is unaffected.
  const handleGeneratePdf = useCallback(async (row: JobOrder) => {
    if (user && user.role !== 'admin' && user.site !== row.JobHead_Plant) {
      alert('Access Denied: You are only allowed to manage records for your assigned site.')
      return
    }
    const k = `${row.JobHead_JobNum}|${row.OrderDtl_PartNum}`
    setGenerating((prev) => ({ ...prev, [k]: true }))
    try {
      const materials: Record<string, string> = {}
      try {
        const rows = await fetchPackingMaterials([row.JobHead_Plant])
        for (const r of rows) {
          if (r.JobHead_Plant && r.Calculated_List_Material) {
            materials[r.JobHead_Plant] = r.Calculated_List_Material
          }
        }
      } catch (err) {
        console.error('Packaging material lookup failed:', err)
        alert('PDF generation error: could not retrieve Packaging Material. ' +
          (err instanceof Error ? err.message : String(err)))
      }
      const { generateMiniLotPdf } = await import('@/utils/generateMiniLotPdf')
      generateMiniLotPdf(row, data ?? [], {
        site: user?.site ?? '',
        companyName: user?.companyname ?? '',
        packagingMaterials: materials,
      })
    } finally {
      setGenerating((prev) => ({ ...prev, [k]: false }))
    }
  }, [data, user])

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Job Order
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Manage packing orders and carton lot generation
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="primary"
            size="md"
            icon={RefreshCw}
            loading={isLoading || manualRefreshing}
            onClick={fetchData}
          >
            {isLoading || manualRefreshing
              ? syncTarget === 'all' || syncTarget == null
                ? 'Syncing...'
                : syncTarget === 'search'
                  ? 'Syncing search...'
                  : `Syncing Order #${syncTarget}...`
              : 'Sync Data'}
          </Button>
        </div>
      </div>

      {successMsg && <Message msg={{ text: successMsg, type: 'success' }} />}
      {error && <Message msg={{ text: error, type: 'error' }} />}
      {syncMsg && <Message msg={syncMsg} />}

      <JobOrderParentTable
        rows={parentRows}
        columnFilters={parentColumnFilters}
        showFilters={parentShowFilters}
        loading={isLoading}
        onSearch={setSearch}
        onFilterChange={handleParentFilterChange}
        onToggleFilters={handleParentToggleFilters}
        onClearFilters={handleParentClearFilters}
        onRowClick={handleParentRowClick}
        onCreateAll={(p) => handleCreateAll(p.company, p.orderNum)}
        onPackingSheet={handleParentPackingSheet}
      />

      {parentOpen && (
        <JobOrderLinesModal
          company={parentOpen.company}
          orderNum={parentOpen.orderNum}
          rows={parentChildren}
          cartonLots={cartonLots}
          cartonNums={cartonNums}
          palletData={palletData}
          creating={creating}
          generating={generating}
          columnFilters={columnFilters}
          showFilters={showFilters}
          user={user}
          onSearch={setSearch}
          onFilterChange={(key, val) => setColumnFilters((p) => ({ ...p, [key]: val }))}
          onToggleFilters={() => { if (showFilters) setColumnFilters({}); setShowFilters(!showFilters) }}
          onClearFilters={() => setColumnFilters({})}
          onRowClick={setSelectedRow}
          onAction={handleAction}
          onGeneratePdf={handleGeneratePdf}
          onPackingSheet={handlePackingSheetClick}
          onCreateAll={() => parentOpen && handleCreateAll(parentOpen.company, parentOpen.orderNum)}
          onClose={() => setParentOpen(null)}
        />
      )}

      {packingSheetRows && (
        <PackingSheetOptionsModal
          defaultSite={user?.site}
          defaultCompanyName={user?.companyname}
          onConfirm={(site, companyName) => {
            runPackingSheet(packingSheetRows, { site, companyName })
            setPackingSheetRows(null)
          }}
          onClose={() => setPackingSheetRows(null)}
        />
      )}

      <JobOrderDetailModal
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        allData={data ?? []}
        filtered={filtered}
        cartonLots={cartonLots}
        cartonNums={cartonNums}
        palletData={palletData}
      />

      <JobOrderEditModal
        row={editRow}
        editValues={editValues}
        onEditChange={setEditValues}
        onSave={() => editRow && handleUpdate(editRow)}
        onClose={() => setEditRow(null)}
      />

      {previewRow && previewData && (
        <CartonLotPreviewModal
          row={previewRow}
          preview={previewData}
          loading={creatingPreview}
          onConfirm={handleConfirmCreate}
          onClose={() => { setPreviewRow(null); setPreviewData(null) }}
        />
      )}

      {batchState && (
        <BatchProgressModal
          company={batchState.company}
          orderNum={String(batchState.orderNum).padStart(9, '0')}
          lines={batchValidated}
          running={batchRunning}
          isAdmin={user?.role === 'admin'}
          plants={availableBatchPlants}
          plantFilter={batchPlantFilter}
          onPlantFilterChange={handleBatchPlantFilter}
          onConfirm={handleBatchConfirm}
          onClose={handleBatchClose}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
