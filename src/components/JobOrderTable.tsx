import { useState, useMemo } from 'react'
import { FileText, RotateCcw, Plus } from 'lucide-react'
import { padNum, parseLineDesc } from '@/utils/format'
import DataTable from './DataTable'
import SearchBox from './SearchBox'
import Button from './Button'
import type { JobOrder, PalletInfo } from '@/types'
import type { SessionUser } from '@/types'
import type { Column } from './DataTable'

interface Props {
  data: JobOrder[]
  filtered: JobOrder[]
  cartonLots: Record<string, string>
  cartonNums?: Record<string, string>
  palletData: Record<string, PalletInfo>
  creating: Record<string, boolean>
  generating: Record<string, boolean>
  columnFilters: Record<string, string>
  showFilters: boolean
  user: SessionUser | null
  onSearch: (val: string) => void
  onFilterChange: (key: string, val: string) => void
  onToggleFilters: () => void
  onClearFilters: () => void
  onRowClick: (row: JobOrder) => void
  onAction: (row: JobOrder) => void
  onGeneratePdf?: (row: JobOrder) => void
}

export default function JobOrderTable({
  data, filtered, cartonLots, cartonNums, palletData, creating, generating, columnFilters, showFilters, user,
  onSearch, onFilterChange, onToggleFilters, onClearFilters, onRowClick, onAction,
  onGeneratePdf,
}: Props) {
  const [search, setSearch] = useState('')

  function doSearch(val: string) {
    setSearch(val)
    onSearch(val)
  }

  function doFilter(key: string, val: string) {
    onFilterChange(key, val)
  }

  const cartonRanges = useMemo(() => {
    const ranges: Record<string, { start: number; end: number }> = {}
    const grouped: Record<string, JobOrder[]> = {}
    for (const d of data) {
      const gk = `${d.OrderHed_Company}|${d.OrderHed_OrderNum}`
      if (!grouped[gk]) grouped[gk] = []
      grouped[gk].push(d)
    }
    for (const rows of Object.values(grouped)) {
      rows.sort((a, b) => a.OrderDtl_OrderLine - b.OrderDtl_OrderLine)
      let running = 0
      for (const d of rows) {
        const pk = `${d.JobHead_JobNum}|${d.OrderDtl_PartNum}`
        const parsed = parseLineDesc(d.OrderDtl_LineDesc || '')
        const qi = parseInt(parsed.qtyInner) || d.OrderDtl_FS_PcsPerBox_c || 0
        const qc = parseInt(parsed.qtyCarton) || d.OrderDtl_FS_BoxPerCarton_c || 0
        if (qi && qc) {
          const cartons = Math.floor(((d.OrderDtl_OrderQty || 0) * 1000) / (qi * qc))
          ranges[pk] = { start: running + 1, end: running + cartons }
          running += cartons
        }
      }
    }
    return ranges
  }, [data])

  const columns: Column<JobOrder>[] = useMemo(() => [
    { key: 'OrderCompany', label: 'Order Company', sortable: true, render: (r) => r.OrderHed_Company },
    { key: 'OrderLine', label: 'Order / Line', sortable: true, render: (r) => <>{String(r.OrderHed_OrderNum).padStart(9, '0')}-{String(r.OrderDtl_OrderLine).padStart(2, '0')}</> },
    { key: 'PartNumber', label: 'Part Number', render: (r) => r.OrderDtl_PartNum },
    { key: 'QtyInner', label: 'PCS/Inner', align: 'right', sortable: true, render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.OrderDtl_FS_PcsPerBox_c ?? '-'}</span> },
    { key: 'QtyCarton', label: 'Inner/CTN', align: 'right', sortable: true, render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.OrderDtl_FS_BoxPerCarton_c ?? '-'}</span> },
    { key: 'QtyUom', label: 'QTY / UOM', sortable: true, filterable: false, render: (r) => <>{r.JobHead_ProdQty?.toLocaleString() ?? '-'} {r.JobHead_IUM}</> },
    { key: 'TotalCTN', label: 'Total CTN', align: 'right', sortable: true, render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.Calculated_Total_CTN?.toLocaleString() ?? '-'}</span> },
    {
      key: 'CartonNumber', label: 'Carton Number', filterable: false,
      render: (r) => {
        const pk = `${r.JobHead_JobNum}|${r.OrderDtl_PartNum}`
        const stored = cartonNums?.[pk]
        if (stored) return <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{stored}</span>
        const cr = cartonRanges[pk]
        if (!cr) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>
        return <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{padNum(cr.start)} - {padNum(cr.end)}</span>
      },
    },
    { key: 'PlantPacking', label: 'Plant Packing', sortable: true, render: (r) => r.Calculated_PlantPacking ?? '-' },
    { key: 'JobNum', label: 'Job Num', render: (r) => r.JobHead_JobNum },
    {
      key: 'InternalLot', label: 'Internal Lot No', filterable: false,
      render: (r) => {
        const k = `${r.JobHead_JobNum}|${r.OrderDtl_PartNum}`
        const pData = palletData[k]
        const lot = cartonLots[k]
        if (!pData) return '-'
        return <>{lot} {padNum(pData.startpallet, 6)} - {lot} {padNum(pData.endpallet, 6)}</>
      },
    },
    {
      key: 'Action', label: 'Action', filterable: false, align: 'center', stickyRight: true,
      render: (r) => {
        const k = `${r.JobHead_JobNum}|${r.OrderDtl_PartNum}`
        const isCreating = creating[k]
        const hasLot = !!cartonLots[k]
        if (isCreating) {
          return (
            <Button variant="ghost" size="xs" loading disabled>
              Creating
            </Button>
          )
        }
        const showPdf = hasLot && onGeneratePdf
        const hasQty = (r.OrderDtl_FS_PcsPerBox_c ?? 0) > 0 && (r.OrderDtl_FS_BoxPerCarton_c ?? 0) > 0
        const isGenerating = generating[k]
        if (isGenerating) {
          return (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: 82, flexShrink: 0, visibility: 'hidden' }}>
                <Button variant="warning" size="xs" style={{ width: '100%' }}>Update</Button>
              </div>
              <div style={{ width: 64, flexShrink: 0 }}>
                <Button variant="ghost" size="xs" loading disabled style={{ width: '100%' }}>
                  Generating
                </Button>
              </div>
            </div>
          )
        }
        if (!hasLot && (!hasQty || !r.JobHead_JobNum)) return null
        const canAct = user && (user.role === 'admin' || user.site === r.JobHead_Plant)
        const siteTooltip = 'You are only allowed to manage records for your assigned site.'
        return (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: 82, flexShrink: 0 }}>
              <Button
                variant={hasLot ? 'warning' : 'primary'}
                size="xs"
                icon={hasLot ? RotateCcw : Plus}
                disabled={!canAct}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!canAct) return
                  onAction(r)
                }}
                style={{ width: '100%' }}
                title={!canAct ? siteTooltip : undefined}
              >
                {hasLot ? 'Update' : 'Create'}
              </Button>
            </div>
            <div style={{ width: 64, flexShrink: 0, visibility: showPdf ? 'visible' : 'hidden', pointerEvents: showPdf ? 'auto' : 'none' }}>
              <Button
                variant="success"
                size="xs"
                icon={FileText}
                disabled={!canAct}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!canAct) return
                  onGeneratePdf?.(r)
                }}
                style={{ width: '100%' }}
                title={!canAct ? siteTooltip : undefined}
              >
                PDF
              </Button>
            </div>
          </div>
        )
      },
    },
  ], [cartonNums, cartonRanges, palletData, cartonLots, creating, generating, user, onAction, onGeneratePdf])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <SearchBox
        value={search}
        onChange={doSearch}
        placeholder="Search PO, Part, Plant, Job Num, Company..."
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
      />

      {/* Warning legend */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', fontSize: 11, lineHeight: 1.4,
          background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
          borderRadius: 'var(--radius-sm)',
          marginTop: -4,
        }}
      >
        <div
          style={{
            width: 12, height: 12, borderRadius: 2, flexShrink: 0,
            background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
          }}
        />
        <span style={{ color: 'var(--text-secondary)' }}>
          Yellow rows: missing <strong>PCS/Inner</strong> or <strong>Inner/CTN</strong> values.
        </span>
      </div>
      <DataTable<JobOrder>
        columns={columns}
        data={filtered}
        keyFn={(r, i) => `${r.OrderHed_OrderNum}-${r.OrderDtl_OrderLine}-${r.OrderDtl_PartNum}-${i}`}
        onRowClick={onRowClick}
        pageSize={25}
        pageSizeOptions={[25, 50, 100, 200]}
        filterRow={showFilters}
        filterValues={columnFilters}
        onFilterChange={(key, val) => doFilter(key, val)}
        onClearFilters={onClearFilters}
        emptyMsg="No job orders found."
        rowStyle={(r) => {
          const hasQty = (r.OrderDtl_FS_PcsPerBox_c ?? 0) > 0 && (r.OrderDtl_FS_BoxPerCarton_c ?? 0) > 0
          if (!hasQty) return { background: 'var(--warning-bg)' }
          return undefined
        }}
      />
    </div>
  )
}
