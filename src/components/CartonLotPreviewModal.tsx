import { X } from 'lucide-react'
import { padNum } from '@/utils/format'
import Button from './Button'
import Portal from './Portal'
import type { JobOrder } from '@/types'

export interface CartonLotPreviewData {
  jobNum: string
  partNum: string
  orderNum: number
  orderLine: number
  company: string
  lotId: string
  internalLot: string
  startPallet: number
  endPallet: number
  pages: number
  pcsPerBox: number
  boxPerCarton: number
  totalCtn: number
  orderQty: number
  cartonStart: number
  cartonEnd: number
  cartonNumber: string
}

interface Props {
  row: JobOrder
  preview: CartonLotPreviewData
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}

const cell: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--border)',
  fontSize: 13,
}

const label: React.CSSProperties = {
  ...cell,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
}

export default function CartonLotPreviewModal({ row, preview, loading, onConfirm, onClose }: Props) {
  const palletCount = preview.pages > 0 ? preview.endPallet - preview.startPallet + 1 : 0
  const hasRange = preview.pages > 0 && palletCount > 0

  return (
    <Portal>
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(4px)', padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, background: 'var(--bg-card)',
          borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid var(--border)', overflow: 'hidden',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Carton Lot Creation Preview
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {row.JobHead_JobNum} &middot; {row.OrderDtl_PartNum} &middot; {row.OrderHed_Company}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Preview table */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={label}>Lot ID</td>
                <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{preview.lotId}</td>
              </tr>
              <tr>
                <td style={label}>Internal Lot No</td>
                <td style={{ ...cell, fontFamily: 'var(--font-mono)' }}>
                  {hasRange
                    ? `${preview.lotId} ${padNum(preview.startPallet, 6)} - ${preview.lotId} ${padNum(preview.endPallet, 6)}`
                    : '-'
                  }
                </td>
              </tr>
              <tr>
                <td style={label}>Carton Number</td>
                <td style={{ ...cell, fontFamily: 'var(--font-mono)' }}>
                  {preview.cartonNumber || '-'}
                </td>
              </tr>
              <tr>
                <td style={label}>Pallet Range</td>
                <td style={{ ...cell, fontFamily: 'var(--font-mono)' }}>
                  {hasRange
                    ? `${preview.startPallet} - ${preview.endPallet} (${palletCount} pallets)`
                    : '-'}
                </td>
              </tr>
              <tr>
                <td style={label}>Total Pages</td>
                <td style={cell}>{preview.pages} pages</td>
              </tr>
              <tr>
                <td style={label}>PCS/Inner</td>
                <td style={cell}>{preview.pcsPerBox}</td>
              </tr>
              <tr>
                <td style={label}>Inner/CTN</td>
                <td style={cell}>{preview.boxPerCarton}</td>
              </tr>
              <tr>
                <td style={label}>Total CTN</td>
                <td style={cell}>{preview.totalCtn.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ ...label, borderBottom: 'none' }}>Order Qty</td>
                <td style={{ ...cell, borderBottom: 'none' }}>{preview.orderQty.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" loading={loading} onClick={onConfirm}>
            {loading ? 'Creating...' : 'Confirm Create'}
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
