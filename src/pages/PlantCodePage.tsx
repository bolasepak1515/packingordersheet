import { useState, useMemo, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { usePlantCodes, useCreatePlantCode, useUpdatePlantCode, useDeletePlantCode } from '@/hooks/useMasterData'
import { useAuth } from '@/contexts/AuthContext'
import DataTable from '@/components/DataTable'
import Button from '@/components/Button'
import Message from '@/components/Message'
import StatusBadge from '@/components/StatusBadge'
import ConfirmDialog from '@/components/ConfirmDialog'
import Portal from '@/components/Portal'
import type { Column } from '@/components/DataTable'
import { formatRelativeTime } from '@/utils/format'
import type { PlantCode, FlashMessage } from '@/types'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  outline: 'none',
  color: 'var(--text-primary)',
  background: 'var(--bg-card)',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 5,
  letterSpacing: '0.01em',
}

export default function PlantCodePage() {
  const { user } = useAuth()
  const { data: allCodes = [], isLoading } = usePlantCodes()
  const createMutation = useCreatePlantCode()
  const updateMutation = useUpdatePlantCode()
  const deleteMutation = useDeletePlantCode()
  const [editing, setEditing] = useState<PlantCode | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PlantCode | null>(null)

  const [plantCode, setPlantCode] = useState('')
  const [plantName, setPlantName] = useState('')
  const [company, setCompany] = useState('')
  const [runningPallet, setRunningPallet] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [msg, setMsg] = useState<FlashMessage | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const items = useMemo(() => {
    if (user && user.role !== 'admin') {
      return allCodes.filter((item) => item.plant_name === user.site)
    }
    return allCodes
  }, [allCodes, user])

  function flash(text: string, type: 'success' | 'error') { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  function resetForm() {
    setPlantCode(''); setPlantName(''); setCompany(''); setRunningPallet(''); setIsActive(true); setEditing(null)
  }

  function openAdd() {
    resetForm()
    setShowModal(true)
  }

  function openEdit(item: PlantCode) {
    setEditing(item)
    setPlantCode(item.plant_code)
    setPlantName(item.plant_name ?? '')
    setCompany(item.company ?? '')
    setRunningPallet(item.running_pallet ?? '')
    setIsActive(item.is_active)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    resetForm()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!plantCode.trim()) { flash('Plant code is required.', 'error'); return }
    setSubmitting(true)
    const payload = { plant_code: plantCode.trim(), plant_name: plantName.trim() || null, company: company.trim() || null, is_active: isActive, running_pallet: runningPallet.trim() || null, updated_at: new Date().toISOString() }

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      flash(editing ? 'Plant code updated!' : 'Plant code added!', 'success')
      closeModal()
    } catch (err: unknown) {
      flash((editing ? 'Update' : 'Error') + ': ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
    setSubmitting(false)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      flash('Plant code deleted.', 'success')
    } catch (err: unknown) {
      flash('Delete failed: ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
    setDeleteTarget(null)
  }

  const plantCodeColumns: Column<PlantCode>[] = [
    { key: 'Code', label: 'Code', sortable: true, render: (item) => <span style={{ fontWeight: 500 }}>{item.plant_code}</span> },
    { key: 'Name', label: 'Name', render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.plant_name ?? '-'}</span> },
    { key: 'Company', label: 'Company', sortable: true, render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.company ?? '-'}</span> },
    { key: 'RunningPallet', label: 'Running Pallet', render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.running_pallet ?? '-'}</span> },
    { key: 'LastUpdate', label: 'Last Update', sortable: true, render: (item) => {
      const val = item.updated_at
      if (!val) return <span style={{ color: 'var(--text-secondary)' }}>-</span>
      const d = new Date(val)
      if (isNaN(d.getTime())) return <span style={{ color: 'var(--text-secondary)' }}>{val}</span>
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>{dd}/{mm}/{d.getFullYear()} {hh}:{mi}</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 10px',
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              background: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatRelativeTime(val)}
          </span>
        </div>
      )
    } },
    { key: 'Status', label: 'Status', render: (item) => <StatusBadge active={item.is_active} /> },
    {
      key: 'Actions', label: 'Actions', filterable: false, align: 'center', stickyRight: true,
      render: (item) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button variant="secondary" size="xs" icon={Pencil} onClick={(e) => { e.stopPropagation(); openEdit(item) }}>Edit</Button>
          <Button variant="danger" size="xs" icon={Trash2} onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Plant Code</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage plant locations and their codes</p>
        </div>
        {user?.role === 'admin' && <Button variant="primary" size="md" icon={Plus} onClick={openAdd}>Add Plant Code</Button>}
      </div>
      <Message msg={msg} />

      <DataTable<PlantCode>
        columns={plantCodeColumns}
        data={items}
        keyFn={(item) => item.id}
        emptyMsg="No plant codes found."
        loading={isLoading}
      />

      {/* Add / Edit Modal */}
      {showModal && (
        <Portal>
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)', padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, background: 'var(--bg-card)',
              borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid var(--border)', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editing ? <Pencil size={14} /> : <Plus size={14} />}
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {editing ? 'Edit Plant Code' : 'Add New Plant Code'}
                </h2>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '20px 20px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    ['plant_code', 'Plant Code', plantCode, setPlantCode, true, 'e.g. PLT-001'],
                    ['plant_name', 'Plant Name', plantName, setPlantName, false, 'e.g. Factory 1'],
                    ['company', 'Company', company, setCompany, false, 'e.g. Supermax'],
                    ['running_pallet', 'Running Pallet', runningPallet, setRunningPallet, false, 'e.g. 1000'],
                  ].map(([id, label, val, set, req, placeholder]) => (
                    <div key={id as string}>
                      <label htmlFor={`modal-${id}`} style={labelStyle}>
                        {label as string}{req ? ' *' : ''}
                      </label>
                      <input
                        id={`modal-${id}`}
                        type="text"
                        value={String(val)}
                        required={!!req}
                        placeholder={placeholder as string}
                        onChange={(e) => (set as (v: string) => void)(e.target.value)}
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    id="modal-is_active"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="modal-is_active" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Active</label>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 8, padding: '20px' }}>
                <Button type="submit" variant="primary" size="md" loading={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Saving...' : editing ? 'Update Plant Code' : 'Add Plant Code'}
                </Button>
                <Button type="button" variant="secondary" size="md" icon={X} onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="Delete Plant Code"
        description={`Are you sure you want to delete "${deleteTarget?.plant_code}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
