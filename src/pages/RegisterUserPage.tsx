import { useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useLoginUsers, useCreateLoginUser, useUpdateLoginUser, useDeleteLoginUser } from '@/hooks/useMasterData'
import { useAuth } from '@/contexts/AuthContext'
import DataTable from '@/components/DataTable'
import Button from '@/components/Button'
import Message from '@/components/Message'
import StatusBadge from '@/components/StatusBadge'
import ConfirmDialog from '@/components/ConfirmDialog'
import Portal from '@/components/Portal'
import type { Column } from '@/components/DataTable'
import type { LoginRow, FlashMessage } from '@/types'

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

export default function RegisterUserPage() {
  const { user } = useAuth()
  const { data: items = [], isLoading } = useLoginUsers()
  const createMutation = useCreateLoginUser()
  const updateMutation = useUpdateLoginUser()
  const deleteMutation = useDeleteLoginUser()
  const [editing, setEditing] = useState<LoginRow | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LoginRow | null>(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [company, setCompany] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [site, setSite] = useState('')
  const [status, setStatus] = useState(true)
  const [msg, setMsg] = useState<FlashMessage | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function flash(text: string, type: 'success' | 'error') { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  function resetForm() {
    setUsername(''); setPassword(''); setRole('user'); setCompany(''); setCompanyName(''); setSite(''); setStatus(true); setEditing(null)
  }

  function openAdd() {
    resetForm()
    setShowModal(true)
  }

  function openEdit(item: LoginRow) {
    setEditing(item)
    setUsername(item.username)
    setPassword('')
    setRole(item.role)
    setCompany(item.company ?? '')
    setCompanyName(item.companyname ?? '')
    setSite(item.site ?? '')
    setStatus(item.status)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    resetForm()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim()) { flash('Username is required.', 'error'); return }
    if (!password.trim() && !editing) { flash('Password is required.', 'error'); return }

    const existing = items.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
    if (existing && existing.id !== editing?.id) { flash('Username already exists.', 'error'); return }

    setSubmitting(true)
    const payload: Partial<LoginRow> = {
      username: username.trim(),
      role: role.trim() || 'user',
      company: company.trim(),
      companyname: companyName.trim(),
      site: site.trim(),
      status,
    }
    if (password.trim()) payload.password = password.trim()

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload })
        flash('User updated!', 'success')
      } else {
        await createMutation.mutateAsync(payload)
        flash('User added!', 'success')
      }
      closeModal()
    } catch (err: unknown) {
      flash((editing ? 'Update' : 'Add') + ' failed: ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
    setSubmitting(false)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if (user && deleteTarget.username === user.username) {
      flash('You cannot delete your own account.', 'error')
      setDeleteTarget(null)
      return
    }
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      flash('User deleted.', 'success')
    } catch (err: unknown) {
      flash('Delete failed: ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
    setDeleteTarget(null)
  }

  const columns: Column<LoginRow>[] = [
    { key: 'Username', label: 'Username', sortable: true, render: (item) => <span style={{ fontWeight: 500 }}>{item.username}</span> },
    { key: 'Role', label: 'Role', sortable: true, render: (item) => (
      <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500, background: item.role === 'admin' ? 'var(--warning-bg)' : 'var(--bg-hover)', color: item.role === 'admin' ? 'var(--warning-text)' : 'var(--text-secondary)' }}>{item.role}</span>
    ) },
    { key: 'Company', label: 'Company', sortable: true, render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.company ?? '-'}</span> },
    { key: 'CompanyName', label: 'Company Name', sortable: true, render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.companyname ?? '-'}</span> },
    { key: 'Site', label: 'Site', sortable: true, render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.site ?? '-'}</span> },
    { key: 'Status', label: 'Status', render: (item) => <StatusBadge active={item.status} /> },
    { key: 'LastLogin', label: 'Last Login', sortable: true, render: (item) => {
      const val = item.last_login
      if (!val) return <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>-</span>
      const d = new Date(val)
      if (isNaN(d.getTime())) return <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{val}</span>
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{dd}/{mm}/{d.getFullYear()} {hh}:{mi}</span>
    } },
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
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Register User</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage user accounts and login access</p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={openAdd}>Add User</Button>
      </div>
      <Message msg={msg} />

      <DataTable<LoginRow>
        columns={columns}
        data={items}
        keyFn={(item) => item.id}
        emptyMsg="No users found."
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
                  {editing ? 'Edit User' : 'Add New User'}
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
                  <div>
                    <label htmlFor="modal-username" style={labelStyle}>Username *</label>
                    <input
                      id="modal-username"
                      type="text"
                      value={username}
                      required
                      placeholder="e.g. admin"
                      onChange={(e) => setUsername(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-password" style={labelStyle}>
                      Password {editing ? '(leave blank to keep)' : '*'}
                    </label>
                    <input
                      id="modal-password"
                      type="password"
                      value={password}
                      required={!editing}
                      placeholder={editing ? '••••••••' : 'e.g. password123'}
                      onChange={(e) => setPassword(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-role" style={labelStyle}>Role *</label>
                    <select
                      id="modal-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="modal-company" style={labelStyle}>Company</label>
                    <input
                      id="modal-company"
                      type="text"
                      value={company}
                      placeholder="e.g. Supermax"
                      onChange={(e) => setCompany(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-companyname" style={labelStyle}>Company Name</label>
                    <input
                      id="modal-companyname"
                      type="text"
                      value={companyName}
                      placeholder="e.g. Supermax"
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-site" style={labelStyle}>Site</label>
                    <input
                      id="modal-site"
                      type="text"
                      value={site}
                      placeholder="e.g. Plant 1"
                      onChange={(e) => setSite(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    id="modal-status"
                    type="checkbox"
                    checked={status}
                    onChange={(e) => setStatus(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="modal-status" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Active</label>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 8, padding: '20px' }}>
                <Button type="submit" variant="primary" size="md" loading={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Saving...' : editing ? 'Update User' : 'Add User'}
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
        title="Delete User"
        description={`Are you sure you want to delete "${deleteTarget?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
