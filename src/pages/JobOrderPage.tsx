import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useJobOrders, useSavePackingTrans } from '@/hooks/useJobOrders'
import { usePlantCodes, useSizes, usePackingTrans } from '@/hooks/useMasterData'
import { getWeekNumber } from '@/utils/weekNumber'
import { parseLineDesc, extractSizeFromPartNum, padNum } from '@/utils/format'
import { useAuth } from '@/contexts/AuthContext'
import Message from '@/components/Message'
import Button from '@/components/Button'
import { TableSkeleton } from '@/components/Skeleton'
import JobOrderParentTable from '@/components/JobOrderParentTable'
import JobOrderLinesModal from '@/components/JobOrderLinesModal'
import PackingSheetOptionsModal from '@/components/PackingSheetOptionsModal'
import type { ParentOrder } from '@/components/JobOrderParentTable'
import JobOrderDetailModal from '@/components/JobOrderDetailModal'
import JobOrderEditModal from '@/components/JobOrderEditModal'
import CartonLotPreviewModal from '@/components/CartonLotPreviewModal'
import type { JobOrder, PalletInfo } from '@/types'
import type { CartonLotPreviewData } from '@/components/CartonLotPreviewModal'

export type { JobOrder }

export default function JobOrderPage() {
  const { user } = useAuth()
  const [serverSearch, setServerSearch] = useState('')
  const { data, isLoading, isFetching, error: queryErr, refetch } = useJobOrders(serverSearch)
  const { data: plantLookup = [] } = usePlantCodes()
  const { data: sizeLookup = [] } = useSizes()
  const { data: packingTrans = [] } = usePackingTrans()
  const savePackingTrans = useSavePackingTrans()
  const [error, setError] = useState<string | null>(null)
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

  // Keep typing smooth: filtering lags slightly behind keystrokes while the
  // deferred value (and thus the filtered dataset) catches up.
  const deferredSearch = useDeferredValue(search)

  // Debounce the search term so the server-side OData $filter query only fires
  // after the user pauses typing (avoids hammering Epicor per keystroke).
  useEffect(() => {
    const t = setTimeout(() => setServerSearch(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

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

  function fetchData() {
    setError(null)
    refetch()
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
        g = { company: d.OrderHed_Company, orderNum: d.OrderHed_OrderNum, orderDate: '', needBy: '', poNum: '', lineCount: 0, createdCount: 0, notAssignSiteCount: 0, noJobCount: 0, totalCtn: 0, plantPacking: [], ppCounts: new Map(), ppCreated: new Map() }
        map.set(key, g)
      }
      g.lineCount++
      if (!d.JobHead_JobNum) g.noJobCount++
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

    const plantValue = plantMap[row.JobHead_Plant] ?? row.JobHead_Plant
    const now = new Date()
    const yearDigit = String(now.getFullYear()).slice(-1)
    const weekStr = String(getWeekNumber(now)).padStart(2, '0')
    const sizeName = extractSizeFromPartNum(row.OrderDtl_PartNum)
    const sizeCode = sizeMap[sizeName] ?? ''
    const lot = `${plantValue}${yearDigit}${weekStr}${sizeCode}`
    const runningPallet = parseInt(pcData?.running_pallet) || 0
    const startPallet = runningPallet + 1
    const parsed = parseLineDesc(row.OrderDtl_LineDesc || '')
    const qi = parseInt(parsed.qtyInner) || row.OrderDtl_FS_PcsPerBox_c || 0
    const qc = parseInt(parsed.qtyCarton) || row.OrderDtl_FS_BoxPerCarton_c || 0
    const threshold = qi * qc
    const pages = threshold >= 1000 ? Math.ceil((row.OrderDtl_OrderQty || 0) / 50) : Math.ceil((row.OrderDtl_OrderQty || 0) / 25)
    const pallets = Math.ceil(pages / (threshold >= 1000 ? 2 : 4))
    const endPallet = startPallet + pallets - 1

    // Cumulative carton range across order lines
    let cartonStart = 0, cartonEnd = 0
    if (qi && qc) {
      const cartons = Math.floor(((row.OrderDtl_OrderQty || 0) * 1000) / (qi * qc))
      let prev = 0
      const allRows = data ?? []
      for (const r of allRows) {
        if (r.OrderHed_Company !== row.OrderHed_Company || r.OrderHed_OrderNum !== row.OrderHed_OrderNum) continue
        if (r.OrderDtl_OrderLine >= row.OrderDtl_OrderLine) break
        const p = parseLineDesc(r.OrderDtl_LineDesc || '')
        const qi2 = parseInt(p.qtyInner) || r.OrderDtl_FS_PcsPerBox_c || 0
        const qc2 = parseInt(p.qtyCarton) || r.OrderDtl_FS_BoxPerCarton_c || 0
        if (qi2 && qc2) prev += Math.floor(((r.OrderDtl_OrderQty || 0) * 1000) / (qi2 * qc2))
      }
      cartonStart = prev + 1
      cartonEnd = prev + cartons
    }

    setPreviewData({
      jobNum: row.JobHead_JobNum,
      partNum: row.OrderDtl_PartNum,
      orderNum: row.OrderHed_OrderNum,
      orderLine: row.OrderDtl_OrderLine,
      company: row.OrderHed_Company,
      lotId: lot,
      internalLot: row.OrderDtl_FS_LotNumber_c ?? '',
      startPallet,
      endPallet,
      pages,
      pcsPerBox: qi,
      boxPerCarton: qc,
      totalCtn: row.Calculated_Total_CTN ?? 0,
      orderQty: row.OrderDtl_OrderQty ?? 0,
      cartonStart,
      cartonEnd,
      cartonNumber: cartonEnd > 0 ? `${padNum(cartonStart, 5)} - ${padNum(cartonEnd, 5)}` : '',
    })
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

  const handleGeneratePdf = useCallback((row: JobOrder) => {
    if (user && user.role !== 'admin' && user.site !== row.JobHead_Plant) {
      alert('Access Denied: You are only allowed to manage records for your assigned site.')
      return
    }
    const k = `${row.JobHead_JobNum}|${row.OrderDtl_PartNum}`
    setGenerating((prev) => ({ ...prev, [k]: true }))
    import('@/utils/generateMiniLotPdf')
      .then((m) => m.generateMiniLotPdf(row, data ?? [], { site: user?.site ?? '', companyName: user?.companyname ?? '' }))
      .finally(() => setGenerating((prev) => ({ ...prev, [k]: false })))
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
          {serverSearch && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 100,
              background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', whiteSpace: 'nowrap',
            }}>
              {isFetching ? <RefreshCw size={12} className="spin" /> : <Search size={12} />}
              {isFetching ? `Searching server for "${serverSearch}"…` : `Server search: "${serverSearch}"`}
            </span>
          )}
          <Button
            variant="primary"
            size="md"
            icon={RefreshCw}
            loading={isFetching}
            onClick={fetchData}
          >
            {isFetching ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {successMsg && <Message msg={{ text: successMsg, type: 'success' }} />}
      {error && <Message msg={{ text: error, type: 'error' }} />}

      {isLoading && !data ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <JobOrderParentTable
          rows={parentRows}
          columnFilters={parentColumnFilters}
          showFilters={parentShowFilters}
          onSearch={setSearch}
          onFilterChange={handleParentFilterChange}
          onToggleFilters={handleParentToggleFilters}
          onClearFilters={handleParentClearFilters}
          onRowClick={handleParentRowClick}
        />
      )}

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
