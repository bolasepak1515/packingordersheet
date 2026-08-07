import { memo, useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, SearchX, X } from 'lucide-react'
import { TableSkeleton } from './Skeleton'

export interface Column<T> {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => React.ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number
  filterable?: boolean
  width?: string
  stickyRight?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyFn?: (row: T, i: number) => string | number
  onRowClick?: (row: T) => void
  pageSize?: number
  pageSizeOptions?: number[]
  emptyMsg?: string
  filterRow?: boolean
  filterValues?: Record<string, string>
  onFilterChange?: (key: string, val: string) => void
  onClearFilters?: () => void
  loading?: boolean
  dense?: boolean
  rowStyle?: (row: T, index: number) => React.CSSProperties | undefined
  defaultSortCol?: string
  defaultSortDir?: 'asc' | 'desc'
}

const HEADER_H = 38

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 4, verticalAlign: 'middle', lineHeight: 1 }}>
      <ArrowUp
        size={10}
        style={{
          color: active && dir === 'asc' ? 'var(--accent)' : '#d4d4d8',
          marginBottom: -1,
          transition: 'color 0.15s ease',
        }}
      />
      <ArrowDown
        size={10}
        style={{
          color: active && dir === 'desc' ? 'var(--accent)' : '#d4d4d8',
          transition: 'color 0.15s ease',
        }}
      />
    </span>
  )
}

function DataTable<T>({
  columns, data, keyFn, onRowClick, pageSize: ps = 0,
  pageSizeOptions = [25, 50, 100, 200],
  emptyMsg = 'No data.',
  filterRow = false, filterValues, onFilterChange, onClearFilters,
  loading = false, dense: denseProp, rowStyle,
  defaultSortCol, defaultSortDir = 'asc',
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(ps || 25)
  const [sortCol, setSortCol] = useState<string | null>(defaultSortCol ?? null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir)
  const [hoverKey, setHoverKey] = useState<React.Key | null>(null)
  const [filterFocus, setFilterFocus] = useState<string | null>(null)
  const isDense = denseProp ?? false
  const pad = isDense ? '6px 12px' : '12px 16px'
  const headPad = isDense ? '0 12px' : '0 16px'

  const pageSize = ps || size
  const getKey = keyFn ?? ((_: T, i: number) => i)

  useEffect(() => {
    const maxPage = Math.ceil(data.length / pageSize) || 1
    if (page > maxPage) setPage(1)
  }, [data.length, pageSize])

  const sorted = sortCol
    ? [...data].sort((a, b) => {
        const col = columns.find((c) => c.key === sortCol)
        const av = String(col?.sortValue ? col.sortValue(a) : col?.render(a) ?? '')
        const bv = String(col?.sortValue ? col.sortValue(b) : col?.render(b) ?? '')
        return sortDir === 'asc'
          ? av.localeCompare(bv, undefined, { numeric: true })
          : bv.localeCompare(av, undefined, { numeric: true })
      })
    : data

  const totalPages = Math.ceil(sorted.length / pageSize) || 1
  const paged = pageSize ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted

  function handleSort(key: string) {
    if (sortCol === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(key); setSortDir('asc') }
  }

  const hasActiveFilters = filterValues && Object.values(filterValues).some((v) => v)

  if (loading) return <TableSkeleton rows={8} cols={columns.length} />

  const rowStart = sorted.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rowEnd = Math.min(page * pageSize, sorted.length)

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-card)',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {sorted.length}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {sorted.length === 1 ? 'record' : 'records'}
          </span>
          {hasActiveFilters && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: 'var(--accent-text)',
              background: 'var(--accent)', borderRadius: 100, padding: '1px 7px',
              lineHeight: '16px',
            }}>
              {Object.values(filterValues ?? {}).filter((v) => v).length}
            </span>
          )}
        </div>
        {hasActiveFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 100,
              background: 'var(--accent-soft)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-secondary)',
              fontSize: 11, fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <X size={12} />
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', scrollbarWidth: 'thin' }}>
        <table style={{ width: '100%', minWidth: 'max-content', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    height: HEADER_H,
                    padding: headPad,
                    textAlign: col.align ?? 'left',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    fontWeight: 600,
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                    cursor: col.sortable ? 'pointer' : undefined,
                    userSelect: 'none',
                    position: 'sticky',
                    top: 0,
                    zIndex: col.stickyRight ? 4 : 2,
                    width: col.width,
                    transition: 'color 0.15s ease',
                    ...(col.sortable ? { color: 'var(--text-primary)' } : {}),
                    ...(col.stickyRight ? { right: 0 } : {}),
                  }}
                  onMouseEnter={(e) => { if (col.sortable) e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseLeave={(e) => { if (col.sortable) e.currentTarget.style.color = 'var(--text-primary)' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {col.label}
                    {col.sortable && <SortIcon active={sortCol === col.key} dir={sortCol === col.key ? sortDir : 'asc'} />}
                  </span>
                </th>
              ))}
            </tr>
            {filterRow && onFilterChange && (
              <tr>
                {columns.map((col) => (
                  <th
                    key={`f-${col.key}`}
                    style={{
                      height: HEADER_H,
                      padding: isDense ? '4px 12px' : '6px 16px',
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--accent-soft)',
                      position: 'sticky',
                      top: HEADER_H,
                      zIndex: col.stickyRight ? 4 : 2,
                      ...(col.stickyRight ? { position: 'sticky' as const, right: 0 } : {}),
                    }}
                  >
                    {col.filterable !== false ? (
                      <input
                        value={filterValues?.[col.key] ?? ''}
                        onChange={(e) => onFilterChange(col.key, e.target.value)}
                        placeholder="Filter"
                        onFocus={() => setFilterFocus(col.key)}
                        onBlur={() => setFilterFocus(null)}
                        style={{
                          width: '100%',
                          padding: '5px 9px',
                          border: `1px solid ${filterFocus === col.key ? 'var(--border-focus)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 11,
                          outline: 'none',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          boxShadow: filterFocus === col.key ? '0 0 0 3px rgba(24,24,27,0.07)' : 'none',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        }}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '64px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-tertiary)' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <SearchX size={22} strokeWidth={1.5} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{String(emptyMsg)}</span>
                    {hasActiveFilters && (
                      <span style={{ fontSize: 12 }}>Try adjusting or clearing the active filters.</span>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row, i) => {
                const key = getKey(row, i)
                const extra = rowStyle?.(row, i)
                const isHover = hoverKey === key
                const stickyBg = extra?.background != null ? String(extra.background) : isHover ? 'var(--bg-hover)' : 'var(--bg-card)'
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={() => setHoverKey(key)}
                    onMouseLeave={() => setHoverKey((k) => (k === key ? null : k))}
                    style={{
                      ...extra,
                      background: extra?.background != null ? String(extra.background) : (isHover ? 'var(--bg-hover)' : 'var(--bg-card)'),
                      cursor: onRowClick ? 'pointer' : undefined,
                      transition: 'background 0.12s ease',
                    } as React.CSSProperties}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: pad,
                          borderBottom: '1px solid var(--border)',
                          textAlign: col.align ?? 'left',
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: 'var(--text-primary)',
                          verticalAlign: 'middle',
                          background: col.stickyRight ? stickyBg : 'inherit',
                          ...(col.stickyRight
                            ? { position: 'sticky' as const, right: 0, zIndex: 3, boxShadow: '-10px 0 14px -10px rgba(0,0,0,0.12)' }
                            : {}),
                        }}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && (
        <div
          style={{
            padding: '10px 16px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setSize(Number(e.target.value)); setPage(1) }}
              style={{
                padding: '5px 28px 5px 10px',
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              {pageSizeOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
              {rowStart}–{rowEnd} of {sorted.length}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: '5px 9px',
                  fontSize: 12,
                  background: 'var(--bg-card)',
                  color: page <= 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { if (page > 1) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-focus)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 28, padding: '5px 8px',
                  fontSize: 12, fontWeight: 600,
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {page}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
                / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '5px 9px',
                  fontSize: 12,
                  background: 'var(--bg-card)',
                  color: page >= totalPages ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { if (page < totalPages) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-focus)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MemoizedDataTable = memo(DataTable) as typeof DataTable

export default MemoizedDataTable
