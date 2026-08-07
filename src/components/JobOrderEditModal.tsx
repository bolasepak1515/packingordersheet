import Modal from './Modal'
import Button from './Button'
import { padNum } from '@/utils/format'
import type { JobOrder } from '@/types'

interface EditVals {
  startpallet: number
  endpallet: number
  cartonlot: string
  cartonNumber: string
}

function formatCartonNumber(value: string, totalCtn: number): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const nums = trimmed.match(/\d+/g)
  if (!nums || nums.length === 0) return trimmed
  const start = parseInt(nums[0], 10) || 0
  const end = nums.length > 1
    ? (parseInt(nums[1], 10) || 0)
    : (totalCtn > 0 ? start + totalCtn - 1 : start)
  return `${padNum(start, 5)} - ${padNum(end, 5)}`
}

interface Props {
  row: JobOrder | null
  editValues: EditVals
  onEditChange: (v: EditVals) => void
  onSave: () => void
  onClose: () => void
}

export default function JobOrderEditModal({
  row,
  editValues,
  onEditChange,
  onSave,
  onClose,
}: Props) {
  if (!row) return null

  const renderField = ([field, label, val, type]: readonly [string, string, number | string, 'text' | 'number'], style?: React.CSSProperties) => (
    <div
      key={field}
      style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}
    >
      <label
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={val}
        placeholder={field === 'cartonNumber' ? `Enter start only e.g. 2 (Total CTN: ${row.Calculated_Total_CTN ?? '-'})` : ''}
        onChange={(e) =>
          onEditChange({
            ...editValues,
            [field]:
              type === 'number'
                ? Number(e.target.value)
                : e.target.value,
          })
        }
        style={{
          padding: '8px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          outline: 'none',
          color: 'var(--text-primary)',
          background: 'var(--bg-card)',
          transition: 'border-color 0.12s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-focus)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          if (field === 'cartonNumber') {
            onEditChange({ ...editValues, cartonNumber: formatCartonNumber(editValues.cartonNumber, row.Calculated_Total_CTN ?? 0) })
          }
        }}
      />
    </div>
  )

  return (
    <Modal open={!!row} onClose={onClose} title="Edit Packing Order" width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {renderField(['cartonlot', 'Carton Lot', editValues.cartonlot, 'text'])}
        {renderField(['cartonNumber', 'Carton Number', editValues.cartonNumber, 'text'])}
        <div style={{ display: 'flex', gap: 12 }}>
          {renderField(['startpallet', 'Start Pallet', editValues.startpallet, 'number'], { flex: 1 })}
          {renderField(['endpallet', 'End Pallet', editValues.endpallet, 'number'], { flex: 1 })}
        </div>
        <Button variant="warning" size="lg" onClick={onSave} style={{ marginTop: 4 }}>
          Save Changes
        </Button>
      </div>
    </Modal>
  )
}
