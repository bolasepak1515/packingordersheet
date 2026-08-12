import { memo, useMemo, useState } from 'react'
import { Check, Layers, FileText, RefreshCw } from 'lucide-react'
import { formatDateOrRaw } from '@/utils/format'
import DataTable from './DataTable'
import SearchBox from './SearchBox'
import ActionMenu from './ActionMenu'
import type { ActionMenuItem } from './ActionMenu'
import type { Column } from './DataTable'

export interface PlantPackingEntry {
  code: string
  count: number
  created: number
  pending: number
}

function plantAvatar(code: string): string {
  const c = code.trim().toUpperCase()
  if (!c) return c
  if (c === 'MFGSYS') return 'MFG'
  if (/^\d+$/.test(c)) return c.slice(-2)
  return c.slice(-3)
}

function companyAvatar(code: string): string {
  const c = code.trim().toUpperCase()
  if (!c) return c
  return c.length <= 4 ? c : c.slice(0, 3)
}

function daysUntil(raw: string): number | null {
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((target - start) / 86400000)
}

function statusOf(created: number, count: number): { label: string; color: string } {
  if (count <= 0) return { label: 'No Created', color: '#dc2626' }
  if (created >= count) return { label: 'Completed', color: '#059669' }
  if (created > 0) return { label: 'Partially Created', color: '#b45309' }
  return { label: 'No Created', color: '#dc2626' }
}

const AVATAR_COLORS = [
  '#4f46e5', '#7c3aed', '#0f766e', '#b91c1c', '#be185d',
  '#1d4ed8', '#0e7490', '#3f6212', '#a16207', '#9f1239',
  '#4338ca', '#6d28d9', '#047857', '#991b1b', '#c026d3',
  '#1e40af', '#0c4a6e', '#365314', '#854d0e', '#86198f',
]

function avatarColor(code: string): string {
  let h = 0
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export interface ParentOrder {
  company: string
  orderNum: number
  orderDate: string
  needBy: string
  poNum: string
  lineCount: number
  createdCount: number
  notAssignSiteCount: number
  noJobCount: number
  totalCtn: number
  packingReady: boolean
  plantPacking: PlantPackingEntry[]
}

interface Props {
  rows: ParentOrder[]
  columnFilters: Record<string, string>
  showFilters: boolean
  loading?: boolean
  isSyncing?: boolean
  syncedCount?: number
  onSearch: (val: string) => void
  onFilterChange: (key: string, val: string) => void
  onToggleFilters: () => void
  onClearFilters: () => void
  onRowClick: (parent: ParentOrder) => void
  onCreateAll?: (parent: ParentOrder) => void
  onPackingSheet?: (parent: ParentOrder) => void
}

function JobOrderParentTable({
  rows, columnFilters, showFilters, loading, isSyncing, syncedCount, onSearch, onFilterChange, onToggleFilters, onClearFilters, onRowClick, onCreateAll, onPackingSheet,
}: Props) {
  const [search, setSearch] = useState('')

  function doSearch(val: string) {
    setSearch(val)
    onSearch(val)
  }

  function doFilter(key: string, val: string) {
    onFilterChange(key, val)
  }

  const columns: Column<ParentOrder>[] = useMemo(() => [
    { key: 'OrderCompany', label: 'Order Company', sortable: true, render: (r) => (
      <span
        title={r.company}
        style={{
          width: 60, height: 30, borderRadius: 8,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
          background: avatarColor(r.company),
          color: '#fff',
          border: '3px solid #fff',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {companyAvatar(r.company)}
      </span>
    ) },
    { key: 'OrderNum', label: 'Order Num', sortable: true, render: (r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{String(r.orderNum).padStart(9, '0')}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 100,
          background: '#e4e4e7', color: '#27272a', whiteSpace: 'nowrap',
        }}>
          {r.lineCount} Lines
        </span>
      </div>
    ) },
    { key: 'OrderDate', label: 'Order Date', sortable: true, sortValue: (r) => r.orderDate || '', render: (r) => (r.orderDate ? formatDateOrRaw(r.orderDate) : '-') },
    { key: 'NeedBy', label: 'Need By', render: (r) => {
      if (!r.needBy) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>
      const diff = daysUntil(r.needBy)
      const badge = diff == null ? null
        : diff < 0
          ? { text: `-${Math.abs(diff)} days`, bg: '#fee2e2', color: '#b91c1c' }
          : diff <= 7
            ? { text: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `${diff} days`, bg: '#fffbeb', color: '#b45309' }
            : { text: `${diff} days`, bg: '#eff6ff', color: '#1d4ed8' }
      return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDateOrRaw(r.needBy)}</span>
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 100, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
              {badge.text}
            </span>
          )}
        </div>
      )
    } },
    { key: 'GRef', label: 'G / Ref', sortable: true, render: (r) => r.poNum || '-' },
    { key: 'TotalCtn', label: 'Total Order', align: 'right', sortable: true, render: (r) => (
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {r.totalCtn != null ? `${r.totalCtn.toLocaleString()} CTN` : '-'}
      </span>
    ) },
    { key: 'PlantPacking', label: 'Plant Packing', sortable: true, render: (r) => (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {r.plantPacking.length === 0 ? (
          <span style={{ color: 'var(--text-tertiary)' }}>-</span>
        ) : r.plantPacking.map((pp, i) => (
          <span
            key={pp.code}
            title={`Site ${pp.code}: ${pp.created} Created, ${pp.pending} Pending Creation`}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
              background: pp.code.toLowerCase() === 'mfgsys' ? '#f59e0b' : avatarColor(pp.code),
              color: '#fff',
              border: '3px solid #fff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
              boxSizing: 'border-box',
              flexShrink: 0,
              position: 'relative',
              zIndex: i,
              marginLeft: i === 0 ? 0 : -12,
            }}
          >
            {plantAvatar(pp.code)}
          </span>
        ))}
      </div>
    ) },
    { key: 'Status', label: 'Pallet ID Tag', render: (r) => {
      const totalCount = r.plantPacking.reduce((s, pp) => s + pp.count, 0)
      const totalCreated = r.plantPacking.reduce((s, pp) => s + pp.created, 0)
      if (totalCount === 0) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>
      const st = statusOf(totalCreated, totalCount)
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
            {st.label === 'Completed' ? (
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #059669', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={10} strokeWidth={3} color="#059669" />
              </span>
            ) : (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
            )}
            <span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span>
            <span style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{totalCreated}/{totalCount}</span>
          </span>
          {r.noJobCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 100, whiteSpace: 'nowrap',
              background: '#fffbeb', color: '#b45309',
            }}>
              {r.noJobCount} . No Job Num
            </span>
          )}
        </div>
      )
    } },
    ...(onCreateAll ? [{
      key: 'Actions', label: 'Actions', filterable: false, align: 'center' as const, stickyRight: true,
      render: (r: ParentOrder) => {
        const items: ActionMenuItem[] = [
          ...(onPackingSheet ? [{
            label: 'Packing Sheet',
            icon: FileText,
            disabled: !r.packingReady,
            title: r.packingReady ? undefined : 'All lines must have an internal lot number, a Job Num and Pcs/Inner & Inner/CTN values (excludes MFGSYS site).',
            onClick: () => onPackingSheet(r),
          }] : []),
          { label: 'Create All Lots', icon: Layers, onClick: () => onCreateAll(r) },
        ]
        return <ActionMenu items={items} />
      },
    }] : []),
  ], [onCreateAll, onRowClick, onPackingSheet])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <SearchBox
        value={search}
        onChange={doSearch}
        placeholder="Search PO, Part, Plant, Job Num, Company..."
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
      />

      {isSyncing && (
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            alignSelf: 'flex-start',
            padding: '6px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            borderRadius: 100, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
          }}
          role="status"
        >
          <RefreshCw size={12} className="spin" />
          Syncing data ({syncedCount?.toLocaleString() ?? 0} loaded)...
        </div>
      )}

      <DataTable<ParentOrder>
        columns={columns}
        data={rows}
        keyFn={(r) => `${r.company}|${r.orderNum}`}
        onRowClick={onRowClick}
        loading={loading}
        pageSize={25}
        pageSizeOptions={[25, 50, 100, 200]}
        filterRow={showFilters}
        filterValues={columnFilters}
        onFilterChange={(key, val) => doFilter(key, val)}
        onClearFilters={onClearFilters}
        defaultSortCol="OrderDate"
        defaultSortDir="asc"
        emptyMsg="No job orders found."
      />
    </div>
  )
}

export default memo(JobOrderParentTable)
