import { AlertTriangle, Info, X } from 'lucide-react'
import Button from './Button'
import Portal from './Portal'

type Variant = 'danger' | 'warning' | 'info'

interface Props {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: Variant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const variantConfig: Record<Variant, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; btnVariant: 'danger' | 'warning' | 'primary' }> = {
  danger: { icon: AlertTriangle, iconBg: '#fef2f2', iconColor: '#ef4444', btnVariant: 'danger' },
  warning: { icon: AlertTriangle, iconBg: '#fffbeb', iconColor: '#f59e0b', btnVariant: 'warning' },
  info: { icon: Info, iconBg: '#eff6ff', iconColor: '#3b82f6', btnVariant: 'primary' },
}

export default function ConfirmDialog({
  open, title, description, confirmText = 'Confirm', cancelText = 'Cancel',
  variant = 'info', loading, onConfirm, onCancel,
}: Props) {
  if (!open) return null
  const cfg = variantConfig[variant]
  const Icon = cfg.icon

  return (
    <Portal>
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, backdropFilter: 'blur(4px)', padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400, background: 'var(--bg-card)',
          borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid var(--border)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={cfg.iconColor} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5, marginBottom: 0 }}>{description}</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '20px' }}>
          <Button variant="secondary" size="sm" onClick={onCancel}>{cancelText}</Button>
          <Button variant={cfg.btnVariant} size="sm" loading={loading} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
