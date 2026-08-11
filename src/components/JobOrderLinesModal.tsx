import { X, FileText, Layers } from 'lucide-react'
import JobOrderTable from './JobOrderTable'
import { padNum } from '@/utils/format'
import { isPackingSheetReady } from '@/utils/batchValidation'
import type { JobOrder, PalletInfo } from '@/types'
import type { SessionUser } from '@/types'
import Portal from './Portal'

interface Props {
  company: string
  orderNum: number
  rows: JobOrder[]
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
  onPackingSheet?: (rows: JobOrder[]) => void
  onCreateAll?: (rows: JobOrder[]) => void
  onClose: () => void
}

export default function JobOrderLinesModal({
  company, orderNum, rows, cartonLots, cartonNums, palletData, creating, generating,
  columnFilters, showFilters, user,
  onSearch, onFilterChange, onToggleFilters, onClearFilters,
  onRowClick, onAction, onGeneratePdf, onPackingSheet, onCreateAll, onClose,
}: Props) {
  const createdCount = rows.filter((r) => cartonLots[`${r.JobHead_JobNum}|${r.OrderDtl_PartNum}`]).length
  const packingReady = rows.length > 0 && rows.every((r) => isPackingSheetReady(r, cartonLots))
  return (
    <Portal>
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(95vw, 1600px)',
          maxHeight: '92vh',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ background: '#1e293b', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Order {padNum(orderNum, 9)} &middot; {company} &middot; {rows.length} {rows.length === 1 ? 'line' : 'lines'}
            </div>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, lineHeight: 1.3, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {company} — {padNum(orderNum, 9)}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onCreateAll?.(rows)}
              style={{ color: '#94a3b8', background: 'none', border: '1px solid #475569', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#94a3b8' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#475569' }}
            >
              <Layers size={14} /> Create All
            </button>
            <button
              onClick={() => onPackingSheet?.(rows)}
              disabled={!packingReady}
              title={packingReady ? undefined : 'All lines must have an internal lot number, a Job Num and Pcs/Inner & Inner/CTN values (excludes MFGSYS site).'}
              style={{ color: packingReady ? '#94a3b8' : '#475569', background: 'none', border: '1px solid #475569', cursor: packingReady ? 'pointer' : 'not-allowed', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: packingReady ? 1 : 0.5, transition: 'all 0.15s' }}
              onMouseEnter={(e) => { if (packingReady) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#94a3b8' } }}
              onMouseLeave={(e) => { if (packingReady) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#475569' } }}
            >
              <FileText size={14} /> Packing Sheet
            </button>
            <button
              onClick={onClose}
              style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '12px 16px', background: '#fff', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Total Lines: <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{rows.length}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            Already Created: <strong style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{createdCount}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
            Not Created Yet: <strong style={{ color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>{rows.length - createdCount}</strong>
          </span>
        </div>

        {/* Table */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1, minHeight: 0, background: '#f8fafc' }}>
          <JobOrderTable
            data={rows}
            filtered={rows}
            cartonLots={cartonLots}
            cartonNums={cartonNums}
            palletData={palletData}
            creating={creating}
            generating={generating}
            columnFilters={columnFilters}
            showFilters={showFilters}
            user={user}
            onSearch={onSearch}
            onFilterChange={onFilterChange}
            onToggleFilters={onToggleFilters}
            onClearFilters={onClearFilters}
            onRowClick={onRowClick}
            onAction={onAction}
            onGeneratePdf={onGeneratePdf}
          />
        </div>
      </div>
    </div>
    </Portal>
  )
}
