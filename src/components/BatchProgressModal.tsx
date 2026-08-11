import { X, Layers, Loader2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import Portal from './Portal'
import Button from './Button'
import type { JobOrder } from '@/types'
import type { BatchLineStatus, LinePreviewData } from '@/utils/batchValidation'

export interface BatchLineEntry {
  key: string
  row: JobOrder
  status: BatchLineStatus
  reason: string
  detail?: LinePreviewData
}

interface Props {
  company: string
  orderNum: string
  lines: BatchLineEntry[]
  running: boolean
  isAdmin: boolean
  plants: string[]
  plantFilter: string
  onPlantFilterChange: (val: string) => void
  onConfirm: () => void
  onClose: () => void
}

const BADGES: Record<BatchLineStatus, { bg: string; color: string; text: string }> = {
  pending: { bg: '#e4e4e7', color: '#3f3f46', text: 'Pending' },
  creating: { bg: '#dbeafe', color: '#1d4ed8', text: 'Creating...' },
  completed: { bg: '#d1fae5', color: '#047857', text: 'Completed' },
  failed: { bg: '#fee2e2', color: '#b91c1c', text: 'Failed' },
  skipped: { bg: '#fef3c7', color: '#b45309', text: 'Skipped' },
}

export default function BatchProgressModal({
  company, orderNum, lines, running, isAdmin, plants, plantFilter,
  onPlantFilterChange, onConfirm, onClose,
}: Props) {
  const targets = lines.filter((l) => l.status === 'pending' || l.status === 'creating' || l.status === 'completed' || l.status === 'failed')
  const done = lines.filter((l) => l.status === 'completed' || l.status === 'failed').length
  const failed = lines.filter((l) => l.status === 'failed').length
  const skipped = lines.filter((l) => l.status === 'skipped').length
  const total = targets.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const finished = !running && (total === 0 ? lines.length > 0 : done === total)

  return (
    <Portal>
      <div
        onClick={() => { if (!running) onClose() }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)', padding: 24,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(95vw, 640px)', maxHeight: '92vh',
            background: 'var(--bg-card)', borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid var(--border)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Batch Lot Creation
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {company} &middot; {orderNum} &middot; {lines.length} {lines.length === 1 ? 'line' : 'lines'}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={running}
              style={{ background: 'none', border: 'none', cursor: running ? 'not-allowed' : 'pointer', color: 'var(--text-tertiary)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', opacity: running ? 0.4 : 1 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Filter + summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {isAdmin ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Plant</span>
                <select
                  value={plantFilter}
                  onChange={(e) => onPlantFilterChange(e.target.value)}
                  disabled={running}
                  style={{
                    padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', outline: 'none', cursor: running ? 'not-allowed' : 'pointer',
                    background: 'var(--bg-card)', color: 'var(--text-primary)',
                  }}
                >
                  <option value="">All Plants</option>
                  {plants.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Creating lots for your site only
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              <span><strong style={{ color: 'var(--text-primary)' }}>{total}</strong> to create</span>
              <span><strong style={{ color: '#059669' }}>{done}</strong> done</span>
              {failed > 0 && <span><strong style={{ color: '#b91c1c' }}>{failed}</strong> failed</span>}
              {skipped > 0 && <span><strong style={{ color: '#b45309' }}>{skipped}</strong> skipped</span>}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span>{running ? 'Processing...' : finished ? 'Complete' : 'Ready'}</span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 100, background: 'var(--bg-hover)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%', width: `${pct}%`,
                  background: total > 0 && done === total ? '#059669' : 'linear-gradient(90deg,#6366f1,#4f46e5)',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>
          </div>

          {/* Line list */}
          <div style={{ padding: '9px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Carton Lot Creation Preview
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {lines.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                No lines found for this order.
              </div>
            ) : (
              lines.map((entry) => {
                const b = BADGES[entry.status]
                const d = entry.detail
                return (
                  <div
                    key={entry.key}
                    style={{ padding: '9px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{entry.row.JobHead_JobNum || '-'}</span>
                        <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.row.OrderDtl_PartNum}</span>
                        <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 100, background: 'var(--bg-hover)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{entry.row.JobHead_Plant}</span>
                      </div>
                      {d && (entry.status === 'completed' || entry.status === 'pending' || entry.status === 'creating') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                          {entry.status !== 'completed' && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '1px 6px', borderRadius: 4, background: '#eef2ff', color: '#4f46e5', fontFamily: 'var(--font-sans)' }}>
                              Preview
                            </span>
                          )}
                          {d.lotId} &middot; Pallet {d.pages > 0 ? `${d.startPallet} - ${d.endPallet} (${d.endPallet - d.startPallet + 1} pallets)` : '-'} &middot; Carton {d.cartonNumber || '-'}
                        </div>
                      )}
                      {entry.reason && entry.status !== 'completed' && (
                        <div style={{ fontSize: 11.5, color: b.color, marginTop: 3 }}>{entry.reason}</div>
                      )}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: b.bg, color: b.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {entry.status === 'creating' && <Loader2 size={12} className="batch-spin" />}
                      {entry.status === 'completed' && <CheckCircle2 size={12} />}
                      {entry.status === 'failed' && <XCircle size={12} />}
                      {entry.status === 'skipped' && <MinusCircle size={12} />}
                      {b.text}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            {!finished ? (
              <>
                <Button variant="secondary" size="md" onClick={onClose} disabled={running}>Close</Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={Layers}
                  loading={running}
                  disabled={!running && total === 0}
                  onClick={onConfirm}
                >
                  {running ? 'Creating...' : total === 0 ? 'Nothing to Create' : `Confirm & Start (${total})`}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="md" onClick={onClose}>Close</Button>
                <Button variant="success" size="md" onClick={onClose}>Done</Button>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes batchSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .batch-spin { animation: batchSpin 0.8s linear infinite; }
      `}</style>
    </Portal>
  )
}
