import { useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useSizes, useCreateSize, useUpdateSize, useDeleteSize } from '@/hooks/useMasterData'
import DataTable from '@/components/DataTable'
import Button from '@/components/Button'
import Message from '@/components/Message'
import StatusBadge from '@/components/StatusBadge'
import ConfirmDialog from '@/components/ConfirmDialog'
import Portal from '@/components/Portal'
import type { Column } from '@/components/DataTable'
import type { Size, FlashMessage } from '@/types'

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

export default function SizesPage() {
  const { data: sizes = [], isLoading } = useSizes()
  const createMutation = useCreateSize()
  const updateMutation = useUpdateSize()
  const deleteMutation = useDeleteSize()
  const [editing, setEditing] = useState<Size | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Size | null>(null)

  const [sizeName, setSizeName] = useState('')
  const [sizeCode, setSizeCode] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [msg, setMsg] = useState<FlashMessage | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function flash(text: string, type: 'success' | 'error') { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  function resetForm() {
    setSizeName(''); setSizeCode(''); setSortOrder(0); setDescription(''); setIsActive(true); setEditing(null)
  }

  function openAdd() {
    resetForm()
    setShowModal(true)
  }

  function openEdit(s: Size) {
    setEditing(s); setSizeName(s.size_name); setSizeCode(s.size_code ?? '')
    setSortOrder(s.sort_order); setDescription(s.description ?? ''); setIsActive(s.is_active)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    resetForm()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!sizeName.trim()) { flash('Size name is required.', 'error'); return }
    setSubmitting(true)
    const payload = { size_name: sizeName.trim(), size_code: sizeCode.trim() || null, sort_order: sortOrder, description: description.trim() || null, is_active: isActive }

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      flash(editing ? 'Size updated!' : 'Size added!', 'success')
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
      flash('Size deleted.', 'success')
    } catch (err: unknown) {
      flash('Delete failed: ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
    setDeleteTarget(null)
  }

  const sizesColumns: Column<Size>[] = [
    { key: 'Name', label: 'Name', sortable: true, render: (s) => <span style={{ fontWeight: 500 }}>{s.size_name}</span> },
    { key: 'Code', label: 'Code', render: (s) => <span style={{ color: 'var(--text-secondary)' }}>{s.size_code ?? '-'}</span> },
    { key: 'Status', label: 'Status', render: (s) => <StatusBadge active={s.is_active} /> },
    {
      key: 'Actions', label: 'Actions', filterable: false, align: 'center', stickyRight: true,
      render: (s) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <Button variant="secondary" size="xs" icon={Pencil} onClick={(e) => { e.stopPropagation(); openEdit(s) }}>Edit</Button>
          <Button variant="danger" size="xs" icon={Trash2} onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Size Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage product sizes and their codes</p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={openAdd}>Add Size</Button>
      </div>
      <Message msg={msg} />

      <DataTable<Size>
        columns={sizesColumns}
        data={sizes}
        keyFn={(s) => s.id}
        emptyMsg="No sizes found."
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
                  {editing ? 'Edit Size' : 'Add New Size'}
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
                    ['size_name', 'Size Name', sizeName, setSizeName, true, 'e.g. M'],
                    ['size_code', 'Size Code', sizeCode, setSizeCode, false, 'e.g. M-01'],
                    ['sort_order', 'Sort Order', sortOrder, (v: string) => setSortOrder(parseInt(v) || 0), false, '0'],
                  ].map(([id, label, val, set, req, placeholder]) => (
                    <div key={id as string}>
                      <label htmlFor={`modal-${id}`} style={labelStyle}>
                        {label as string}{req ? ' *' : ''}
                      </label>
                      <input
                        id={`modal-${id}`}
                        type={id === 'sort_order' ? 'number' : 'text'}
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
                <div style={{ marginTop: 16 }}>
                  <label htmlFor="modal-description" style={labelStyle}>Description</label>
                  <textarea id="modal-description" value={description} placeholder="Optional description"
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'} />
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
                  {submitting ? 'Saving...' : editing ? 'Update Size' : 'Add Size'}
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
        title="Delete Size"
        description={`Are you sure you want to delete "${deleteTarget?.size_name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
